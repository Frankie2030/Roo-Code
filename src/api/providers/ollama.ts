import { Anthropic } from "@anthropic-ai/sdk"
import OpenAI from "openai"

import { type ModelInfo, openAiModelInfoSaneDefaults, DEEP_SEEK_DEFAULT_TEMPERATURE } from "@roo-code/types"

import type { ApiHandlerOptions } from "../../shared/api"

import { XmlMatcher } from "../../utils/xml-matcher"
import { convertJsonToXml } from "../../utils/converters/json-to-xml"
import { getRooCodeToolsJsonSchema } from "../../utils/schemas/roo-tools-schema"

import { convertToOpenAiMessages } from "../transform/openai-format"
import { convertToR1Format } from "../transform/r1-format"
import { ApiStream } from "../transform/stream"

import { BaseProvider } from "./base-provider"
import type { SingleCompletionHandler, ApiHandlerCreateMessageMetadata } from "../index"

type CompletionUsage = OpenAI.Chat.Completions.ChatCompletionChunk["usage"]

export class OllamaHandler extends BaseProvider implements SingleCompletionHandler {
	protected options: ApiHandlerOptions
	private client: OpenAI

	constructor(options: ApiHandlerOptions) {
		super()
		this.options = options
		this.client = new OpenAI({
			baseURL: (this.options.ollamaBaseUrl || "http://localhost:11434") + "/v1",
			apiKey: "ollama",
		})
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const modelId = this.getModel().id
		const useR1Format = modelId.toLowerCase().includes("deepseek-r1")
		const openAiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
			{ role: "system", content: systemPrompt },
			...(useR1Format ? convertToR1Format(messages) : convertToOpenAiMessages(messages)),
		]

		// Determine the JSON schema to use
		let jsonSchema = this.options.ollamaApiFormat
		if (this.options.ollamaApiFormat === true) {
			// Use default Roo Code tools schema if ollamaApiFormat is simply enabled
			jsonSchema = getRooCodeToolsJsonSchema()
		}

		const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
			model: this.getModel().id,
			messages: openAiMessages,
			temperature: this.options.modelTemperature ?? 0,
			stream: true,
			stream_options: { include_usage: true },
			...(jsonSchema && {
				response_format: {
					type: "json_schema",
					json_schema: {
						name: "structured_output",
						schema: jsonSchema,
						strict: true,
					},
				},
			}),
		}

		// Debug logging
		console.log("🔍 Ollama Request Debug:")
		console.log("ollamaApiFormat from options:", this.options.ollamaApiFormat)
		console.log("Using JSON schema:", jsonSchema ? "Yes" : "No")
		console.log("Final request payload:", JSON.stringify(requestPayload, null, 2))

		const stream = await this.client.chat.completions.create(requestPayload)

		// If using structured output, we need to handle JSON-to-XML conversion
		if (jsonSchema) {
			let accumulatedContent = ""
			let lastUsage: CompletionUsage | undefined

			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta

				if (delta?.content) {
					accumulatedContent += delta.content
				}

				if (chunk.usage) {
					lastUsage = chunk.usage
				}
			}

			// Convert accumulated JSON response to XML
			if (accumulatedContent.trim()) {
				const conversionResult = convertJsonToXml(accumulatedContent)

				if (conversionResult.success && conversionResult.xml) {
					// Process the XML through the existing XML matcher for reasoning extraction
					const matcher = new XmlMatcher(
						"think",
						(chunk) =>
							({
								type: chunk.matched ? "reasoning" : "text",
								text: chunk.data,
							}) as const,
					)

					for (const matcherChunk of matcher.update(conversionResult.xml)) {
						yield matcherChunk
					}
					for (const chunk of matcher.final()) {
						yield chunk
					}

					// Log conversion details for debugging
					if (conversionResult.thinking) {
						console.log("🧠 Model Thinking:", conversionResult.thinking)
					}
					if (conversionResult.reasoning) {
						console.log("💭 Model Reasoning:", conversionResult.reasoning)
					}
				} else {
					// If conversion failed, yield the raw content as text
					console.warn("⚠️ JSON-to-XML conversion failed:", conversionResult.error)
					yield {
						type: "text",
						text: accumulatedContent,
					}
				}
			}

			if (lastUsage) {
				yield {
					type: "usage",
					inputTokens: lastUsage?.prompt_tokens || 0,
					outputTokens: lastUsage?.completion_tokens || 0,
				}
			}
		} else {
			// Original streaming behavior for non-structured output
			const matcher = new XmlMatcher(
				"think",
				(chunk) =>
					({
						type: chunk.matched ? "reasoning" : "text",
						text: chunk.data,
					}) as const,
			)
			let lastUsage: CompletionUsage | undefined
			for await (const chunk of stream) {
				const delta = chunk.choices[0]?.delta

				if (delta?.content) {
					for (const matcherChunk of matcher.update(delta.content)) {
						yield matcherChunk
					}
				}
				if (chunk.usage) {
					lastUsage = chunk.usage
				}
			}
			for (const chunk of matcher.final()) {
				yield chunk
			}

			if (lastUsage) {
				yield {
					type: "usage",
					inputTokens: lastUsage?.prompt_tokens || 0,
					outputTokens: lastUsage?.completion_tokens || 0,
				}
			}
		}
	}

	override getModel(): { id: string; info: ModelInfo } {
		return {
			id: this.options.ollamaModelId || "",
			info: openAiModelInfoSaneDefaults,
		}
	}

	async completePrompt(prompt: string): Promise<string> {
		try {
			const modelId = this.getModel().id
			const useR1Format = modelId.toLowerCase().includes("deepseek-r1")

			// Determine the JSON schema to use
			let jsonSchema = this.options.ollamaApiFormat
			if (this.options.ollamaApiFormat === true) {
				// Use default Roo Code tools schema if ollamaApiFormat is simply enabled
				jsonSchema = getRooCodeToolsJsonSchema()
			}

			const requestPayload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
				model: this.getModel().id,
				messages: useR1Format
					? convertToR1Format([{ role: "user", content: prompt }])
					: [{ role: "user", content: prompt }],
				temperature: this.options.modelTemperature ?? (useR1Format ? DEEP_SEEK_DEFAULT_TEMPERATURE : 0),
				stream: false,
				...(jsonSchema && {
					response_format: {
						type: "json_schema",
						json_schema: {
							name: "structured_output",
							schema: jsonSchema,
							strict: true,
						},
					},
				}),
			}

			// Debug logging
			console.log("🔍 Ollama completePrompt Debug:")
			console.log("ollamaApiFormat from options:", this.options.ollamaApiFormat)
			console.log("Using JSON schema:", jsonSchema ? "Yes" : "No")
			console.log("Final request payload:", JSON.stringify(requestPayload, null, 2))

			const response = await this.client.chat.completions.create(requestPayload)
			const content = response.choices[0]?.message.content || ""

			// If using structured output, convert JSON to XML
			if (jsonSchema && content.trim()) {
				const conversionResult = convertJsonToXml(content)

				if (conversionResult.success && conversionResult.xml) {
					// Log conversion details for debugging
					if (conversionResult.thinking) {
						console.log("🧠 Model Thinking:", conversionResult.thinking)
					}
					if (conversionResult.reasoning) {
						console.log("💭 Model Reasoning:", conversionResult.reasoning)
					}

					return conversionResult.xml
				} else {
					// If conversion failed, return the raw content
					console.warn("⚠️ JSON-to-XML conversion failed:", conversionResult.error)
					return content
				}
			}

			return content
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(`Ollama completion error: ${error.message}`)
			}
			throw error
		}
	}
}

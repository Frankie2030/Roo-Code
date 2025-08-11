/**
 * JSON-to-XML Converter for Roo Code Tools
 *
 * This utility converts structured JSON responses from language models
 * back to the XML format expected by Roo Code's existing tool parsing system.
 */

import type { RooCodeToolsResponse, ToolUse } from "../schemas/roo-tools-schema"

export interface ConversionResult {
	success: boolean
	xml?: string
	error?: string
	reasoning?: string
	thinking?: string
}

/**
 * Main conversion function that takes a JSON response and converts it to XML
 */
export function convertJsonToXml(jsonResponse: unknown): ConversionResult {
	try {
		// Handle string input (JSON string)
		let parsedResponse: any
		if (typeof jsonResponse === "string") {
			try {
				parsedResponse = JSON.parse(jsonResponse)
			} catch (e) {
				return {
					success: false,
					error: `Failed to parse JSON string: ${e instanceof Error ? e.message : "Unknown error"}`,
				}
			}
		} else {
			parsedResponse = jsonResponse
		}

		// Validate basic structure
		if (!parsedResponse || typeof parsedResponse !== "object") {
			return {
				success: false,
				error: "Invalid input: expected object or JSON string",
			}
		}

		const response = parsedResponse as Partial<RooCodeToolsResponse>

		// Extract thinking and reasoning for debugging/logging
		const result: ConversionResult = {
			success: true,
			thinking: response.thinking,
			reasoning: response.single_tool?.reasoning || response.multiple_tools?.reasoning,
		}

		switch (response.response_type) {
			case "text_only":
				// For text-only responses, return the text content (no XML needed)
				return {
					success: true,
					xml: response.text_response || "",
					thinking: result.thinking,
				}

			case "single_tool":
				if (!response.single_tool?.tool_use) {
					return {
						success: false,
						error: "Single tool response missing tool_use",
					}
				}
				result.xml = convertSingleToolToXml(response.single_tool.tool_use)
				break

			case "multiple_tools":
				if (!response.multiple_tools?.tools || response.multiple_tools.tools.length === 0) {
					return {
						success: false,
						error: "Multiple tools response missing tools array",
					}
				}
				result.xml = convertMultipleToolsToXml(response.multiple_tools.tools)
				break

			default:
				return {
					success: false,
					error: `Unknown response_type: ${response.response_type}`,
				}
		}

		return result
	} catch (error) {
		return {
			success: false,
			error: `Conversion error: ${error instanceof Error ? error.message : "Unknown error"}`,
		}
	}
}

/**
 * Convert a single tool use to XML format
 */
function convertSingleToolToXml(toolUse: ToolUse): string {
	switch (toolUse.tool) {
		case "read_file":
			return convertReadFileToXml(toolUse)
		case "search_files":
			return convertSearchFilesToXml(toolUse)
		case "list_files":
			return convertListFilesToXml(toolUse)
		case "list_code_definition_names":
			return convertListCodeDefinitionNamesToXml(toolUse)
		case "write_to_file":
			return convertWriteToFileToXml(toolUse)
		case "apply_diff":
			return convertApplyDiffToXml(toolUse)
		case "fetch_instructions":
			return convertFetchInstructionsToXml(toolUse)
		default:
			throw new Error(`Unknown tool type: ${(toolUse as any).tool}`)
	}
}

/**
 * Convert multiple tools to XML format
 */
function convertMultipleToolsToXml(tools: ToolUse[]): string {
	return tools.map((tool) => convertSingleToolToXml(tool)).join("\n\n")
}

/**
 * Convert read_file tool to XML
 */
function convertReadFileToXml(toolUse: any): string {
	const args = toolUse.args
	let xml = "<read_file>\n<args>\n"

	// Handle both single file and array of files
	const files = Array.isArray(args.file) ? args.file : [args.file]

	for (const file of files) {
		xml += "  <file>\n"
		xml += `    <path>${escapeXml(file.path)}</path>\n`
		if (file.line_range) {
			xml += `    <line_range>${escapeXml(file.line_range)}</line_range>\n`
		}
		xml += "  </file>\n"
	}

	xml += "</args>\n</read_file>"
	return xml
}

/**
 * Convert search_files tool to XML
 */
function convertSearchFilesToXml(toolUse: any): string {
	let xml = "<search_files>\n"
	xml += `<path>${escapeXml(toolUse.path)}</path>\n`
	xml += `<regex>${escapeXml(toolUse.regex)}</regex>\n`
	if (toolUse.file_pattern) {
		xml += `<file_pattern>${escapeXml(toolUse.file_pattern)}</file_pattern>\n`
	}
	xml += "</search_files>"
	return xml
}

/**
 * Convert list_files tool to XML
 */
function convertListFilesToXml(toolUse: any): string {
	let xml = "<list_files>\n"
	xml += `<path>${escapeXml(toolUse.path)}</path>\n`
	if (toolUse.recursive !== undefined) {
		xml += `<recursive>${toolUse.recursive}</recursive>\n`
	}
	xml += "</list_files>"
	return xml
}

/**
 * Convert list_code_definition_names tool to XML
 */
function convertListCodeDefinitionNamesToXml(toolUse: any): string {
	let xml = "<list_code_definition_names>\n"
	xml += `<path>${escapeXml(toolUse.path)}</path>\n`
	xml += "</list_code_definition_names>"
	return xml
}

/**
 * Convert write_to_file tool to XML
 */
function convertWriteToFileToXml(toolUse: any): string {
	let xml = "<write_to_file>\n"
	xml += `<path>${escapeXml(toolUse.path)}</path>\n`
	xml += `<content>\n${escapeXml(toolUse.content)}\n</content>\n`
	xml += `<line_count>${toolUse.line_count}</line_count>\n`
	xml += "</write_to_file>"
	return xml
}

/**
 * Convert apply_diff tool to XML
 */
function convertApplyDiffToXml(toolUse: any): string {
	let xml = "<apply_diff>\n"
	xml += `<path>${escapeXml(toolUse.path)}</path>\n`
	xml += `<diff>\n${escapeXml(toolUse.diff)}\n</diff>\n`
	xml += "</apply_diff>"
	return xml
}

/**
 * Convert fetch_instructions tool to XML
 */
function convertFetchInstructionsToXml(toolUse: any): string {
	let xml = "<fetch_instructions>\n"
	xml += `<task>${escapeXml(toolUse.task)}</task>\n`
	xml += "</fetch_instructions>"
	return xml
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;")
}

/**
 * Utility function to validate JSON against expected structure
 */
export function validateJsonStructure(jsonResponse: unknown): { valid: boolean; errors: string[] } {
	const errors: string[] = []

	try {
		const response = typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse

		if (!response || typeof response !== "object") {
			errors.push("Response must be an object")
			return { valid: false, errors }
		}

		if (!response.response_type) {
			errors.push("Missing required field: response_type")
		} else if (!["single_tool", "multiple_tools", "text_only"].includes(response.response_type)) {
			errors.push(`Invalid response_type: ${response.response_type}`)
		}

		switch (response.response_type) {
			case "single_tool":
				if (!response.single_tool) {
					errors.push("single_tool field is required for single_tool response_type")
				} else if (!response.single_tool.tool_use) {
					errors.push("tool_use field is required in single_tool")
				}
				break

			case "multiple_tools":
				if (!response.multiple_tools) {
					errors.push("multiple_tools field is required for multiple_tools response_type")
				} else if (!Array.isArray(response.multiple_tools.tools)) {
					errors.push("tools field must be an array in multiple_tools")
				} else if (response.multiple_tools.tools.length === 0) {
					errors.push("tools array cannot be empty")
				}
				break

			case "text_only":
				if (!response.text_response) {
					errors.push("text_response field is required for text_only response_type")
				}
				break
		}

		return { valid: errors.length === 0, errors }
	} catch (error) {
		errors.push(`JSON parsing error: ${error instanceof Error ? error.message : "Unknown error"}`)
		return { valid: false, errors }
	}
}

/**
 * Batch conversion utility for processing multiple JSON responses
 */
export function convertMultipleJsonToXml(jsonResponses: unknown[]): ConversionResult[] {
	return jsonResponses.map((response) => convertJsonToXml(response))
}

/**
 * Debug utility to pretty-print JSON structure
 */
export function debugJsonStructure(jsonResponse: unknown): string {
	try {
		const response = typeof jsonResponse === "string" ? JSON.parse(jsonResponse) : jsonResponse
		return JSON.stringify(response, null, 2)
	} catch (error) {
		return `Error parsing JSON: ${error instanceof Error ? error.message : "Unknown error"}`
	}
}

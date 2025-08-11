/**
 * Example configurations for Roo Code JSON schemas
 *
 * This file provides ready-to-use JSON schema configurations for common use cases
 * with Ollama structured output and other language model providers.
 */

import { getRooCodeToolsJsonSchema } from "./roo-tools-schema"

// Example 1: Enable structured output with default Roo Code tools schema
export const ENABLE_STRUCTURED_OUTPUT = true

// Example 2: Full Roo Code tools schema (comprehensive)
export const COMPREHENSIVE_TOOLS_SCHEMA = getRooCodeToolsJsonSchema()

// Example 3: Simple file operations only
export const SIMPLE_FILE_OPS_SCHEMA = {
	type: "object",
	properties: {
		response_type: {
			type: "string",
			enum: ["single_tool", "text_only"],
			description: "Type of response",
		},
		single_tool: {
			type: "object",
			properties: {
				tool_use: {
					type: "object",
					discriminator: { propertyName: "tool" },
					oneOf: [
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "read_file" },
								args: {
									type: "object",
									properties: {
										file: {
											oneOf: [
												{
													type: "object",
													properties: {
														path: { type: "string", description: "File path" },
														line_range: {
															type: "string",
															description: "Line range like '1-100'",
														},
													},
													required: ["path"],
												},
												{
													type: "array",
													items: {
														type: "object",
														properties: {
															path: { type: "string", description: "File path" },
															line_range: {
																type: "string",
																description: "Line range like '1-100'",
															},
														},
														required: ["path"],
													},
													maxItems: 5,
												},
											],
										},
									},
									required: ["file"],
								},
							},
							required: ["tool", "args"],
						},
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "write_to_file" },
								path: { type: "string", description: "File path to write" },
								content: { type: "string", description: "File content" },
								line_count: { type: "integer", minimum: 1, description: "Number of lines" },
							},
							required: ["tool", "path", "content", "line_count"],
						},
					],
				},
				reasoning: { type: "string", description: "Why this tool is needed" },
			},
			required: ["tool_use"],
		},
		text_response: { type: "string", description: "Plain text response" },
	},
	required: ["response_type"],
}

// Example 4: Search and exploration focused
export const SEARCH_FOCUSED_SCHEMA = {
	type: "object",
	properties: {
		response_type: {
			type: "string",
			enum: ["single_tool", "multiple_tools", "text_only"],
			description: "Type of response",
		},
		single_tool: {
			type: "object",
			properties: {
				tool_use: {
					type: "object",
					discriminator: { propertyName: "tool" },
					oneOf: [
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "search_files" },
								path: { type: "string", description: "Directory to search" },
								regex: { type: "string", description: "Search pattern" },
								file_pattern: { type: "string", description: "File filter like '*.ts'" },
							},
							required: ["tool", "path", "regex"],
						},
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "list_files" },
								path: { type: "string", description: "Directory to list" },
								recursive: { type: "boolean", description: "Search subdirectories" },
							},
							required: ["tool", "path"],
						},
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "list_code_definition_names" },
								path: { type: "string", description: "File or directory to analyze" },
							},
							required: ["tool", "path"],
						},
					],
				},
				reasoning: { type: "string", description: "Reasoning for tool choice" },
			},
			required: ["tool_use"],
		},
		multiple_tools: {
			type: "object",
			properties: {
				tools: {
					type: "array",
					minItems: 1,
					maxItems: 3,
					items: {
						type: "object",
						discriminator: { propertyName: "tool" },
						oneOf: [
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "search_files" },
									path: { type: "string" },
									regex: { type: "string" },
									file_pattern: { type: "string" },
								},
								required: ["tool", "path", "regex"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "list_files" },
									path: { type: "string" },
									recursive: { type: "boolean" },
								},
								required: ["tool", "path"],
							},
						],
					},
				},
				reasoning: { type: "string" },
			},
			required: ["tools"],
		},
		text_response: { type: "string" },
	},
	required: ["response_type"],
}

// Example 5: Code analysis and modification
export const CODE_MODIFICATION_SCHEMA = {
	type: "object",
	properties: {
		response_type: {
			type: "string",
			enum: ["single_tool", "multiple_tools", "text_only"],
			description: "Type of response",
		},
		thinking: { type: "string", description: "Internal reasoning process" },
		single_tool: {
			type: "object",
			properties: {
				tool_use: {
					type: "object",
					discriminator: { propertyName: "tool" },
					oneOf: [
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "read_file" },
								args: {
									type: "object",
									properties: {
										file: {
											type: "object",
											properties: {
												path: { type: "string" },
												line_range: { type: "string" },
											},
											required: ["path"],
										},
									},
									required: ["file"],
								},
							},
							required: ["tool", "args"],
						},
						{
							type: "object",
							properties: {
								tool: { type: "string", const: "apply_diff" },
								path: { type: "string", description: "File to modify" },
								diff: { type: "string", description: "Search/replace diff block" },
							},
							required: ["tool", "path", "diff"],
						},
					],
				},
				reasoning: { type: "string" },
			},
			required: ["tool_use"],
		},
		text_response: { type: "string" },
	},
	required: ["response_type"],
}

// Example usage configurations for different scenarios
export const USAGE_EXAMPLES = {
	// For general AI assistance with full tool access
	GENERAL_AI_ASSISTANT: COMPREHENSIVE_TOOLS_SCHEMA,

	// For file-focused tasks (reading, writing)
	FILE_MANAGER: SIMPLE_FILE_OPS_SCHEMA,

	// For code exploration and search
	CODE_EXPLORER: SEARCH_FOCUSED_SCHEMA,

	// For simple file operations without complex schemas
	SIMPLE_FILE_OPS: SIMPLE_FILE_OPS_SCHEMA,

	// For search-heavy workflows
	SEARCH_SPECIALIST: SEARCH_FOCUSED_SCHEMA,

	// For code modification workflows
	CODE_MODIFIER: CODE_MODIFICATION_SCHEMA,

	// Enable structured output with default schema (simplest setup)
	BASIC_STRUCTURED: ENABLE_STRUCTURED_OUTPUT,
}

/**
 * Helper function to get a schema by name
 */
export function getSchemaByName(schemaName: keyof typeof USAGE_EXAMPLES) {
	return USAGE_EXAMPLES[schemaName]
}

/**
 * Helper function to validate if a schema name exists
 */
export function isValidSchemaName(name: string): name is keyof typeof USAGE_EXAMPLES {
	return name in USAGE_EXAMPLES
}

/**
 * Get a list of all available schema names
 */
export function getAvailableSchemaNames(): string[] {
	return Object.keys(USAGE_EXAMPLES)
}

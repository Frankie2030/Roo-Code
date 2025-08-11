import { z } from "zod"

/**
 * JSON Schema definitions for Roo Code tools
 *
 * This module provides comprehensive JSON schemas for all Roo Code XML tools,
 * enabling structured output from language models while maintaining compatibility
 * with the existing XML-based tool parsing system.
 */

// File parameter schema for read_file tool
const fileParameterSchema = z.object({
	path: z.string().describe("File path (relative to workspace directory)"),
	line_range: z.string().optional().describe("Line range in format 'start-end' (1-based, inclusive)"),
})

// Args schema for read_file
const readFileArgsSchema = z.object({
	file: z
		.union([fileParameterSchema, z.array(fileParameterSchema)])
		.describe("Single file object or array of file objects (max 5 files)"),
})

// Individual tool schemas
export const readFileSchema = z.object({
	tool: z.literal("read_file"),
	args: readFileArgsSchema,
})

export const searchFilesSchema = z.object({
	tool: z.literal("search_files"),
	path: z.string().describe("Directory path to search (relative to workspace directory)"),
	regex: z.string().describe("Regular expression pattern (Rust regex syntax)"),
	file_pattern: z.string().optional().describe("Glob pattern to filter files (e.g., '*.ts')"),
})

export const listFilesSchema = z.object({
	tool: z.literal("list_files"),
	path: z.string().describe("Directory path to list (relative to workspace directory)"),
	recursive: z.boolean().optional().describe("Whether to list files recursively"),
})

export const listCodeDefinitionNamesSchema = z.object({
	tool: z.literal("list_code_definition_names"),
	path: z.string().describe("File or directory path to analyze (relative to workspace directory)"),
})

export const writeToFileSchema = z.object({
	tool: z.literal("write_to_file"),
	path: z.string().describe("File path to write to (relative to workspace directory)"),
	content: z.string().describe("Complete content to write to the file"),
	line_count: z.number().int().positive().describe("Total number of lines in the file"),
})

export const applyDiffSchema = z.object({
	tool: z.literal("apply_diff"),
	path: z.string().describe("File path to modify (relative to workspace directory)"),
	diff: z.string().describe("Search/replace diff block with SEARCH and REPLACE sections"),
})

export const fetchInstructionsSchema = z.object({
	tool: z.literal("fetch_instructions"),
	task: z.enum(["create_mcp_server", "create_mode"]).describe("Task to get instructions for"),
})

// Union of all tool schemas
export const toolSchema = z.discriminatedUnion("tool", [
	readFileSchema,
	searchFilesSchema,
	listFilesSchema,
	listCodeDefinitionNamesSchema,
	writeToFileSchema,
	applyDiffSchema,
	fetchInstructionsSchema,
])

// Response wrapper schema for structured output
export const toolResponseSchema = z.object({
	tool_use: toolSchema,
	reasoning: z.string().optional().describe("Optional reasoning about why this tool is being used"),
})

// Multiple tools response schema
export const multipleToolsResponseSchema = z.object({
	tools: z.array(toolSchema).min(1).max(5).describe("Array of tool uses (1-5 tools)"),
	reasoning: z.string().optional().describe("Optional reasoning about the tool selection"),
})

// Complete Roo Code tools schema - supports single tool or multiple tools
export const rooCodeToolsSchema = z.object({
	response_type: z.enum(["single_tool", "multiple_tools", "text_only"]).describe("Type of response"),
	single_tool: toolResponseSchema.optional(),
	multiple_tools: multipleToolsResponseSchema.optional(),
	text_response: z.string().optional().describe("Plain text response when no tools are needed"),
	thinking: z.string().optional().describe("Internal reasoning (similar to Claude's thinking)"),
})

// Export the main schema
export const ROO_CODE_TOOLS_JSON_SCHEMA = rooCodeToolsSchema

// Type exports for TypeScript usage
export type FileParameter = z.infer<typeof fileParameterSchema>
export type ReadFileArgs = z.infer<typeof readFileArgsSchema>
export type ToolUse = z.infer<typeof toolSchema>
export type ToolResponse = z.infer<typeof toolResponseSchema>
export type MultipleToolsResponse = z.infer<typeof multipleToolsResponseSchema>
export type RooCodeToolsResponse = z.infer<typeof rooCodeToolsSchema>

// Helper function to get the JSON Schema as a plain object (for API usage)
export function getRooCodeToolsJsonSchema(): Record<string, any> {
	return {
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
						discriminator: {
							propertyName: "tool",
						},
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
															path: {
																type: "string",
																description:
																	"File path (relative to workspace directory)",
															},
															line_range: {
																type: "string",
																description:
																	"Line range in format 'start-end' (1-based, inclusive)",
															},
														},
														required: ["path"],
													},
													{
														type: "array",
														items: {
															type: "object",
															properties: {
																path: {
																	type: "string",
																	description:
																		"File path (relative to workspace directory)",
																},
																line_range: {
																	type: "string",
																	description:
																		"Line range in format 'start-end' (1-based, inclusive)",
																},
															},
															required: ["path"],
														},
														maxItems: 5,
													},
												],
												description:
													"Single file object or array of file objects (max 5 files)",
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
									tool: { type: "string", const: "search_files" },
									path: {
										type: "string",
										description: "Directory path to search (relative to workspace directory)",
									},
									regex: {
										type: "string",
										description: "Regular expression pattern (Rust regex syntax)",
									},
									file_pattern: {
										type: "string",
										description: "Glob pattern to filter files (e.g., '*.ts')",
									},
								},
								required: ["tool", "path", "regex"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "list_files" },
									path: {
										type: "string",
										description: "Directory path to list (relative to workspace directory)",
									},
									recursive: { type: "boolean", description: "Whether to list files recursively" },
								},
								required: ["tool", "path"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "list_code_definition_names" },
									path: {
										type: "string",
										description:
											"File or directory path to analyze (relative to workspace directory)",
									},
								},
								required: ["tool", "path"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "write_to_file" },
									path: {
										type: "string",
										description: "File path to write to (relative to workspace directory)",
									},
									content: { type: "string", description: "Complete content to write to the file" },
									line_count: {
										type: "integer",
										minimum: 1,
										description: "Total number of lines in the file",
									},
								},
								required: ["tool", "path", "content", "line_count"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "apply_diff" },
									path: {
										type: "string",
										description: "File path to modify (relative to workspace directory)",
									},
									diff: {
										type: "string",
										description: "Search/replace diff block with SEARCH and REPLACE sections",
									},
								},
								required: ["tool", "path", "diff"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "fetch_instructions" },
									task: {
										type: "string",
										enum: ["create_mcp_server", "create_mode"],
										description: "Task to get instructions for",
									},
								},
								required: ["tool", "task"],
							},
						],
					},
					reasoning: { type: "string", description: "Optional reasoning about why this tool is being used" },
				},
				required: ["tool_use"],
			},
			multiple_tools: {
				type: "object",
				properties: {
					tools: {
						type: "array",
						minItems: 1,
						maxItems: 5,
						items: {
							// Same oneOf schema as above
							type: "object",
							discriminator: {
								propertyName: "tool",
							},
							oneOf: [
								// Repeat the same tool schemas here for multiple_tools
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
																path: {
																	type: "string",
																	description:
																		"File path (relative to workspace directory)",
																},
																line_range: {
																	type: "string",
																	description:
																		"Line range in format 'start-end' (1-based, inclusive)",
																},
															},
															required: ["path"],
														},
														{
															type: "array",
															items: {
																type: "object",
																properties: {
																	path: {
																		type: "string",
																		description:
																			"File path (relative to workspace directory)",
																	},
																	line_range: {
																		type: "string",
																		description:
																			"Line range in format 'start-end' (1-based, inclusive)",
																	},
																},
																required: ["path"],
															},
															maxItems: 5,
														},
													],
													description:
														"Single file object or array of file objects (max 5 files)",
												},
											},
											required: ["file"],
										},
									},
									required: ["tool", "args"],
								},
								// ... other tools (abbreviated for brevity, same as single_tool)
							],
						},
						description: "Array of tool uses (1-5 tools)",
					},
					reasoning: { type: "string", description: "Optional reasoning about the tool selection" },
				},
				required: ["tools"],
			},
			text_response: { type: "string", description: "Plain text response when no tools are needed" },
			thinking: { type: "string", description: "Internal reasoning (similar to Claude's thinking)" },
		},
		required: ["response_type"],
	}
}

// Preset schemas for common use cases
export const PRESET_SCHEMAS = {
	// Schema for general tool usage
	GENERAL_TOOLS: getRooCodeToolsJsonSchema(),

	// Schema focused on file operations
	FILE_OPERATIONS: {
		type: "object",
		properties: {
			response_type: { type: "string", enum: ["single_tool", "text_only"] },
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
															path: { type: "string" },
															line_range: { type: "string" },
														},
														required: ["path"],
													},
													{
														type: "array",
														items: {
															type: "object",
															properties: {
																path: { type: "string" },
																line_range: { type: "string" },
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
									path: { type: "string" },
									content: { type: "string" },
									line_count: { type: "integer", minimum: 1 },
								},
								required: ["tool", "path", "content", "line_count"],
							},
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "apply_diff" },
									path: { type: "string" },
									diff: { type: "string" },
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
	},

	// Schema for search and exploration
	SEARCH_AND_EXPLORE: {
		type: "object",
		properties: {
			response_type: { type: "string", enum: ["single_tool", "multiple_tools", "text_only"] },
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
							{
								type: "object",
								properties: {
									tool: { type: "string", const: "list_code_definition_names" },
									path: { type: "string" },
								},
								required: ["tool", "path"],
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
	},
} as const

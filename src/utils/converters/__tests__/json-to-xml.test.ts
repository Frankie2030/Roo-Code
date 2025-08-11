import { describe, it, expect } from "vitest"
import { convertJsonToXml, validateJsonStructure, convertMultipleJsonToXml, debugJsonStructure } from "../json-to-xml"

describe("JSON-to-XML Converter", () => {
	describe("convertJsonToXml", () => {
		it("should convert a simple read_file tool to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "read_file",
						args: {
							file: {
								path: "src/test.ts",
							},
						},
					},
					reasoning: "Need to read the test file",
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toBeDefined()
			expect(result.xml).toContain("<read_file>")
			expect(result.xml).toContain("<path>src/test.ts</path>")
			expect(result.reasoning).toBe("Need to read the test file")
		})

		it("should convert read_file with line range to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "read_file",
						args: {
							file: {
								path: "src/app.ts",
								line_range: "1-50",
							},
						},
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<line_range>1-50</line_range>")
		})

		it("should convert multiple files in read_file to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "read_file",
						args: {
							file: [{ path: "src/file1.ts" }, { path: "src/file2.ts", line_range: "10-20" }],
						},
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("src/file1.ts")
			expect(result.xml).toContain("src/file2.ts")
			expect(result.xml).toContain("<line_range>10-20</line_range>")
		})

		it("should convert search_files tool to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "search_files",
						path: "src",
						regex: "\\bfunction\\b",
						file_pattern: "*.ts",
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<search_files>")
			expect(result.xml).toContain("<path>src</path>")
			expect(result.xml).toContain("<regex>\\bfunction\\b</regex>")
			expect(result.xml).toContain("<file_pattern>*.ts</file_pattern>")
		})

		it("should convert list_files tool to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "list_files",
						path: "src",
						recursive: true,
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<list_files>")
			expect(result.xml).toContain("<path>src</path>")
			expect(result.xml).toContain("<recursive>true</recursive>")
		})

		it("should convert write_to_file tool to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "write_to_file",
						path: "output.ts",
						content: 'console.log("Hello World")',
						line_count: 1,
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<write_to_file>")
			expect(result.xml).toContain("<path>output.ts</path>")
			expect(result.xml).toContain('<content>\nconsole.log("Hello World")\n</content>')
			expect(result.xml).toContain("<line_count>1</line_count>")
		})

		it("should convert apply_diff tool to XML", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "apply_diff",
						path: "src/app.ts",
						diff: "<<<<<<< SEARCH\nold code\n=======\nnew code\n>>>>>>> REPLACE",
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<apply_diff>")
			expect(result.xml).toContain("<path>src/app.ts</path>")
			expect(result.xml).toContain("<diff>")
		})

		it("should convert multiple tools to XML", () => {
			const json = {
				response_type: "multiple_tools",
				multiple_tools: {
					tools: [
						{
							tool: "search_files",
							path: "src",
							regex: "TODO",
						},
						{
							tool: "list_files",
							path: "src",
							recursive: false,
						},
					],
					reasoning: "Need to explore the codebase",
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("<search_files>")
			expect(result.xml).toContain("<list_files>")
			expect(result.reasoning).toBe("Need to explore the codebase")
		})

		it("should handle text_only response type", () => {
			const json = {
				response_type: "text_only",
				text_response: "This is a plain text response",
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toBe("This is a plain text response")
		})

		it("should handle JSON string input", () => {
			const jsonString = JSON.stringify({
				response_type: "text_only",
				text_response: "Hello from JSON string",
			})

			const result = convertJsonToXml(jsonString)

			expect(result.success).toBe(true)
			expect(result.xml).toBe("Hello from JSON string")
		})

		it("should escape XML special characters", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "write_to_file",
						path: "test.ts",
						content: '<script>alert("XSS")</script> & "quotes"',
						line_count: 1,
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.xml).toContain("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt; &amp; &quot;quotes&quot;")
		})

		it("should handle thinking field extraction", () => {
			const json = {
				response_type: "single_tool",
				thinking: "I need to analyze this file first",
				single_tool: {
					tool_use: {
						tool: "read_file",
						args: {
							file: { path: "test.ts" },
						},
					},
				},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(true)
			expect(result.thinking).toBe("I need to analyze this file first")
		})

		it("should return error for invalid JSON", () => {
			const result = convertJsonToXml("invalid json")

			expect(result.success).toBe(false)
			expect(result.error).toContain("Failed to parse JSON string")
		})

		it("should return error for missing tool_use", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {},
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(false)
			expect(result.error).toContain("Single tool response missing tool_use")
		})

		it("should return error for unknown response_type", () => {
			const json = {
				response_type: "unknown_type",
			}

			const result = convertJsonToXml(json)

			expect(result.success).toBe(false)
			expect(result.error).toContain("Unknown response_type")
		})
	})

	describe("validateJsonStructure", () => {
		it("should validate correct structure", () => {
			const json = {
				response_type: "text_only",
				text_response: "Hello",
			}

			const result = validateJsonStructure(json)

			expect(result.valid).toBe(true)
			expect(result.errors).toHaveLength(0)
		})

		it("should detect missing response_type", () => {
			const json = {
				text_response: "Hello",
			}

			const result = validateJsonStructure(json)

			expect(result.valid).toBe(false)
			expect(result.errors).toContain("Missing required field: response_type")
		})

		it("should detect invalid response_type", () => {
			const json = {
				response_type: "invalid_type",
			}

			const result = validateJsonStructure(json)

			expect(result.valid).toBe(false)
			expect(result.errors).toContain("Invalid response_type: invalid_type")
		})

		it("should validate single_tool structure", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {
					tool_use: {
						tool: "read_file",
						args: { file: { path: "test.ts" } },
					},
				},
			}

			const result = validateJsonStructure(json)

			expect(result.valid).toBe(true)
		})

		it("should detect missing tool_use in single_tool", () => {
			const json = {
				response_type: "single_tool",
				single_tool: {},
			}

			const result = validateJsonStructure(json)

			expect(result.valid).toBe(false)
			expect(result.errors).toContain("tool_use field is required in single_tool")
		})
	})

	describe("convertMultipleJsonToXml", () => {
		it("should process multiple JSON responses", () => {
			const jsons = [
				{
					response_type: "text_only",
					text_response: "First response",
				},
				{
					response_type: "text_only",
					text_response: "Second response",
				},
			]

			const results = convertMultipleJsonToXml(jsons)

			expect(results).toHaveLength(2)
			expect(results[0].success).toBe(true)
			expect(results[0].xml).toBe("First response")
			expect(results[1].success).toBe(true)
			expect(results[1].xml).toBe("Second response")
		})
	})

	describe("debugJsonStructure", () => {
		it("should pretty-print valid JSON", () => {
			const json = { response_type: "text_only", text_response: "Hello" }

			const result = debugJsonStructure(json)

			expect(result).toContain("response_type")
			expect(result).toContain("text_response")
		})

		it("should handle invalid JSON string", () => {
			const result = debugJsonStructure("invalid json")

			expect(result).toContain("Error parsing JSON")
		})
	})
})

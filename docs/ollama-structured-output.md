# Ollama Structured Output Support

Roo Code now supports structured output for Ollama models through JSON schema enforcement. This feature allows you to constrain Ollama's responses to follow a specific JSON structure, making it easier to integrate AI responses into applications that require predictable data formats.

## Overview

The structured output feature leverages Ollama's `format` parameter to enforce JSON schema validation on model responses. When enabled, the AI will be constrained to generate responses that conform to your specified JSON schema.

## Configuration

### 1. VS Code Settings (Global Configuration)

You can configure structured output globally in your VS Code settings:

1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "ollama format"
3. Find the setting "Roo-cline: Ollama Api Format"
4. Enter your JSON schema as a JSON object

**Example setting in settings.json:**

```json
{
	"roo-cline.ollamaApiFormat": {
		"type": "object",
		"properties": {
			"name": {
				"type": "string"
			},
			"age": {
				"type": "number"
			},
			"skills": {
				"type": "array",
				"items": {
					"type": "string"
				}
			}
		},
		"required": ["name", "age"]
	}
}
```

### 2. Provider Settings UI

Alternatively, you can configure structured output through the Roo Code settings interface:

1. Open Roo Code settings
2. Select "Ollama" as your provider
3. Find the "Structured Output Schema (Optional)" field
4. Enter your JSON schema as a JSON string

**Example:**

```json
{
	"type": "object",
	"properties": { "name": { "type": "string" }, "age": { "type": "number" } },
	"required": ["name", "age"]
}
```

## JSON Schema Format

The structured output uses JSON Schema Draft 7 specification. Here are some common patterns:

### Basic Object Structure

```json
{
	"type": "object",
	"properties": {
		"name": { "type": "string" },
		"age": { "type": "number" },
		"email": { "type": "string", "format": "email" }
	},
	"required": ["name", "age"]
}
```

### Array of Objects

```json
{
	"type": "object",
	"properties": {
		"users": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"id": { "type": "number" },
					"name": { "type": "string" }
				},
				"required": ["id", "name"]
			}
		}
	},
	"required": ["users"]
}
```

### Enums and Constraints

```json
{
	"type": "object",
	"properties": {
		"status": {
			"type": "string",
			"enum": ["active", "inactive", "pending"]
		},
		"priority": {
			"type": "number",
			"minimum": 1,
			"maximum": 5
		}
	},
	"required": ["status", "priority"]
}
```

## Use Cases

### 1. Data Extraction

Extract specific information from text in a structured format:

**Schema:**

```json
{
	"type": "object",
	"properties": {
		"person": {
			"type": "object",
			"properties": {
				"name": { "type": "string" },
				"occupation": { "type": "string" },
				"location": { "type": "string" }
			},
			"required": ["name"]
		}
	},
	"required": ["person"]
}
```

### 2. API Response Generation

Generate responses that match your API specification:

**Schema:**

```json
{
	"type": "object",
	"properties": {
		"success": { "type": "boolean" },
		"data": { "type": "object" },
		"error": {
			"type": "object",
			"properties": {
				"code": { "type": "number" },
				"message": { "type": "string" }
			}
		}
	},
	"required": ["success"]
}
```

### 3. Code Generation

Generate code components with specific structures:

**Schema:**

```json
{
	"type": "object",
	"properties": {
		"function_name": { "type": "string" },
		"parameters": {
			"type": "array",
			"items": {
				"type": "object",
				"properties": {
					"name": { "type": "string" },
					"type": { "type": "string" }
				},
				"required": ["name", "type"]
			}
		},
		"return_type": { "type": "string" },
		"description": { "type": "string" }
	},
	"required": ["function_name", "parameters", "return_type"]
}
```

## Technical Implementation

The feature works by:

1. **Configuration**: The `ollamaApiFormat` setting is added to the provider settings schema
2. **API Integration**: The `OllamaHandler` includes the `format` parameter in both `createMessage` and `completePrompt` methods
3. **Request Modification**: When `ollamaApiFormat` is set, it's passed as the `format` parameter to Ollama's API
4. **Ollama Processing**: Ollama enforces the schema and returns structured JSON responses

### Code Flow

```typescript
// 1. Configuration is set
const options = {
	ollamaModelId: "llama2",
	ollamaApiFormat: {
		/* your schema */
	},
}

// 2. Handler includes format in API request
const requestPayload = {
	model: this.getModel().id,
	messages: openAiMessages,
	temperature: this.options.modelTemperature ?? 0,
	stream: true,
	stream_options: { include_usage: true },
	...(this.options.ollamaApiFormat && { format: this.options.ollamaApiFormat }),
}

// 3. Ollama returns structured response
const response = await this.client.chat.completions.create(requestPayload)
```

## Limitations

1. **Model Support**: Not all Ollama models support structured output. Check your model's documentation
2. **Performance**: Structured output may be slightly slower than unconstrained generation
3. **Schema Complexity**: Very complex schemas might affect response quality or generation speed
4. **Validation**: The feature relies on Ollama's built-in schema validation

## Troubleshooting

### Common Issues

1. **Invalid JSON Schema**: Ensure your schema follows JSON Schema Draft 7 specification
2. **Model Compatibility**: Some models may not support the `format` parameter
3. **Syntax Errors**: Check for proper JSON syntax in your schema configuration

### Debugging

1. **Check Configuration**: Verify your schema is properly set in settings
2. **Test Schema**: Use a JSON Schema validator to test your schema
3. **Model Logs**: Check Ollama logs for any format-related errors

## Examples

### Complete Configuration Example

```json
{
	"apiProvider": "ollama",
	"ollamaModelId": "llama2",
	"ollamaBaseUrl": "http://localhost:11434",
	"ollamaApiFormat": {
		"type": "object",
		"properties": {
			"analysis": {
				"type": "object",
				"properties": {
					"summary": { "type": "string" },
					"sentiment": { "type": "string", "enum": ["positive", "negative", "neutral"] },
					"confidence": { "type": "number", "minimum": 0, "maximum": 1 },
					"keywords": {
						"type": "array",
						"items": { "type": "string" }
					}
				},
				"required": ["summary", "sentiment", "confidence"]
			}
		},
		"required": ["analysis"]
	}
}
```

This configuration will force Ollama to return responses in the specified structured format, making it easier to parse and use the AI's output in your applications.

## Disabling Structured Output

To disable structured output, simply:

1. Set `ollamaApiFormat` to `null` in settings, or
2. Leave the "Structured Output Schema" field empty in the UI

When disabled, Ollama will return regular text responses without schema constraints.

/**
 * Roo Code JSON Schema and XML Converter Utilities
 *
 * This module exports all the utilities for working with structured JSON output
 * and converting it to XML format compatible with Roo Code's existing parsing system.
 */

// Schema definitions and types
export {
	// Main schemas
	rooCodeToolsSchema,
	ROO_CODE_TOOLS_JSON_SCHEMA,
	getRooCodeToolsJsonSchema,
	PRESET_SCHEMAS,

	// Individual tool schemas
	readFileSchema,
	searchFilesSchema,
	listFilesSchema,
	listCodeDefinitionNamesSchema,
	writeToFileSchema,
	applyDiffSchema,
	fetchInstructionsSchema,
	toolSchema,
	toolResponseSchema,
	multipleToolsResponseSchema,

	// TypeScript types
	type FileParameter,
	type ReadFileArgs,
	type ToolUse,
	type ToolResponse,
	type MultipleToolsResponse,
	type RooCodeToolsResponse,
} from "./roo-tools-schema"

// JSON to XML conversion utilities
export {
	convertJsonToXml,
	validateJsonStructure,
	convertMultipleJsonToXml,
	debugJsonStructure,
	type ConversionResult,
} from "../converters/json-to-xml"

// Example configurations
export {
	// Basic enable flag
	ENABLE_STRUCTURED_OUTPUT,

	// Comprehensive schemas
	COMPREHENSIVE_TOOLS_SCHEMA,
	SIMPLE_FILE_OPS_SCHEMA,
	SEARCH_FOCUSED_SCHEMA,
	CODE_MODIFICATION_SCHEMA,

	// Usage examples
	USAGE_EXAMPLES,
	getSchemaByName,
	isValidSchemaName,
	getAvailableSchemaNames,
} from "./examples"

// Import specific schemas and functions for internal use
import { SIMPLE_FILE_OPS_SCHEMA, SEARCH_FOCUSED_SCHEMA } from "./examples"

import { getRooCodeToolsJsonSchema } from "./roo-tools-schema"

// Re-export for convenience
export type {
	// Ollama configuration types
	ApiHandlerOptions,
} from "../../shared/api"

/**
 * Quick start utilities for common use cases
 */

/**
 * Get the default structured output configuration (simplest setup)
 */
export function getDefaultStructuredOutput() {
	return true
}

/**
 * Get a specific preset schema by name
 */
export function getPresetSchema(name: keyof typeof import("./examples").USAGE_EXAMPLES) {
	return import("./examples").then((module) => module.getSchemaByName(name))
}

/**
 * Get all available preset schema names
 */
export function listPresetSchemas() {
	return import("./examples").then((module) => module.getAvailableSchemaNames())
}

/**
 * Create a minimal configuration for Ollama with structured output
 */
export function createOllamaStructuredConfig(options: {
	modelId: string
	baseUrl?: string
	schemaType?: "default" | "file_ops" | "search" | "comprehensive"
}) {
	const { modelId, baseUrl = "http://localhost:11434", schemaType = "default" } = options

	let apiFormat: any = true // Default

	switch (schemaType) {
		case "comprehensive":
			apiFormat = getRooCodeToolsJsonSchema()
			break
		case "file_ops":
			apiFormat = SIMPLE_FILE_OPS_SCHEMA
			break
		case "search":
			apiFormat = SEARCH_FOCUSED_SCHEMA
			break
		default:
			apiFormat = true // Uses default Roo Code tools schema
	}

	return {
		apiProvider: "ollama",
		ollamaModelId: modelId,
		ollamaBaseUrl: baseUrl,
		ollamaApiFormat: apiFormat,
	}
}

/**
 * Validate that an Ollama configuration has structured output enabled
 */
export function isStructuredOutputEnabled(config: any): boolean {
	return !!config?.ollamaApiFormat
}

/**
 * Get a human-readable description of a schema configuration
 */
export function getSchemaDescription(schema: any): string {
	if (schema === true) {
		return "Default Roo Code tools schema (all tools available)"
	}

	if (typeof schema === "object" && schema !== null) {
		// Try to identify preset schemas
		if (schema === SIMPLE_FILE_OPS_SCHEMA) {
			return "File operations only (read, write, apply_diff)"
		}
		if (schema === SEARCH_FOCUSED_SCHEMA) {
			return "Search and exploration tools (search_files, list_files, etc.)"
		}

		// Generic description for custom schemas
		const hasTools = schema.properties?.single_tool || schema.properties?.multiple_tools
		if (hasTools) {
			return "Custom tool schema"
		}

		return "Custom JSON schema"
	}

	return "No structured output (disabled)"
}

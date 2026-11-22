package com.shoppinglist.plugins

import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.contentnegotiation.*
import io.modelcontextprotocol.kotlin.sdk.types.McpJson
import kotlinx.serialization.json.Json

fun Application.configureSerialization() {
    install(ContentNegotiation) {
        // The MCP endpoint (/mcp) serializes its JSON-RPC messages through this ContentNegotiation,
        // because the MCP SDK does not install its own when one already exists. It needs McpJson's
        // settings (encodeDefaults = true, explicitNulls = false): without them, fields equal to their
        // default value are dropped, such as protocolVersion in the initialize result.
        json(Json(McpJson) {
            prettyPrint = true
            isLenient = true
            ignoreUnknownKeys = true
        })
    }
}

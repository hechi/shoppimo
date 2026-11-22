package com.shoppinglist.mcp

import com.shoppinglist.plugins.configureRouting
import com.shoppinglist.plugins.configureSerialization
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.bodyAsText
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.server.sse.SSE
import io.ktor.server.application.install
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/**
 * Checks the MCP endpoint over HTTP with the same plugin setup as the real application,
 * so that the app's own JSON configuration is used for MCP responses.
 */
class McpTransportTest {

    private fun ApplicationTestBuilder.setupApp() {
        application {
            configureSerialization()
            install(SSE)
            configureRouting(enableMcp = true)
        }
    }

    private suspend fun ApplicationTestBuilder.initialize(protocolVersion: String): JsonObject {
        val response = client.post("/mcp") {
            contentType(ContentType.Application.Json)
            header(HttpHeaders.Accept, "application/json, text/event-stream")
            setBody(
                """{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"$protocolVersion",""" +
                    """"capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}"""
            )
        }
        assertEquals(HttpStatusCode.OK, response.status)
        return Json.parseToJsonElement(response.bodyAsText()).jsonObject
    }

    private fun JsonObject.negotiatedVersion(): String? =
        this["result"]?.jsonObject?.get("protocolVersion")?.jsonPrimitive?.content

    @Test
    fun `initialize returns the latest protocol version when the client requests it`() = testApplication {
        setupApp()

        // 2025-11-25 is the SDK's default value for InitializeResult.protocolVersion. It used to be
        // dropped from the response because the app's Json did not encode default values.
        assertEquals("2025-11-25", initialize("2025-11-25").negotiatedVersion())
    }

    @Test
    fun `initialize echoes an older supported protocol version`() = testApplication {
        setupApp()

        assertEquals("2025-03-26", initialize("2025-03-26").negotiatedVersion())
    }

    @Test
    fun `initialize always includes a protocol version for unknown versions`() = testApplication {
        setupApp()

        assertNotNull(initialize("2099-01-01").negotiatedVersion())
    }
}

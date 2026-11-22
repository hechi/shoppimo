package com.shoppinglist.openapi

import com.shoppinglist.plugins.configureSerialization
import com.shoppinglist.routes.StubPushSubscriptionRepository
import com.shoppinglist.routes.listRoutes
import com.shoppinglist.routes.pushRoutes
import io.ktor.client.request.get
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.routing.route
import io.ktor.server.routing.routing
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OpenApiDocsTest {

    private val json = Json { ignoreUnknownKeys = true }

    private fun ApplicationTestBuilder.setupApp() {
        application {
            configureSerialization()
            routing {
                route("/api") {
                    pushRoutes(StubPushSubscriptionRepository())
                    listRoutes()
                    openApiDocs()
                }
            }
        }
    }

    private suspend fun ApplicationTestBuilder.fetchSpec(): JsonObject {
        val response = client.get("/api/openapi.json")
        assertEquals(HttpStatusCode.OK, response.status)
        return json.parseToJsonElement(response.bodyAsText()).jsonObject
    }

    @Test
    fun `serves Swagger UI`() = testApplication {
        setupApp()

        val response = client.get("/api/docs")

        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("swagger", ignoreCase = true))
    }

    @Test
    fun `serves the YAML document used by Swagger UI`() = testApplication {
        setupApp()

        val response = client.get("/api/docs/documentation.yaml")

        assertEquals(HttpStatusCode.OK, response.status)
        assertTrue(response.bodyAsText().contains("/api/lists/{id}"))
    }

    @Test
    fun `spec contains API info including the WebSocket protocol`() = testApplication {
        setupApp()

        val info = fetchSpec()["info"]!!.jsonObject

        assertEquals(API_TITLE, info["title"]!!.jsonPrimitive.content)
        assertEquals(API_VERSION, info["version"]!!.jsonPrimitive.content)
        val description = info["description"]!!.jsonPrimitive.content
        assertTrue(description.contains("/ws/{listId}"))
        for (type in listOf("CONNECTION_ESTABLISHED", "ITEM_ADDED", "ITEM_UPDATED", "ITEM_DELETED", "ITEMS_CLEARED", "ERROR")) {
            assertTrue(description.contains(type), "WebSocket message type $type is not documented")
        }
    }

    @Test
    fun `spec documents every REST endpoint`() = testApplication {
        setupApp()

        val paths = fetchSpec()["paths"]!!.jsonObject
        val expected = mapOf(
            "/api/lists" to setOf("post"),
            "/api/lists/{id}" to setOf("get"),
            "/api/lists/{id}/items" to setOf("post"),
            "/api/lists/{id}/items/{itemId}" to setOf("put", "delete"),
            "/api/lists/{id}/clear-completed" to setOf("post"),
            "/api/lists/by-alias/{alias}" to setOf("get"),
            "/api/lists/{id}/alias" to setOf("put"),
            "/api/push/vapid-key" to setOf("get"),
            "/api/push/subscribe" to setOf("post"),
            "/api/push/unsubscribe" to setOf("post"),
        )

        for ((path, methods) in expected) {
            val item = paths[path]?.jsonObject
            assertTrue(item != null, "Path $path is missing from the spec")
            for (method in methods) {
                val operation = item[method]?.jsonObject
                assertTrue(operation != null, "Operation $method $path is missing from the spec")
                assertTrue(operation["summary"] != null, "Operation $method $path has no summary")
                assertTrue(operation["responses"]?.jsonObject?.isNotEmpty() == true, "Operation $method $path has no responses")
            }
        }
    }
}

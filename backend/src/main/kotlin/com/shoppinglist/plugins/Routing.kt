package com.shoppinglist.plugins

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import com.shoppinglist.mcp.McpServerConfig
import com.shoppinglist.openapi.healthDoc
import com.shoppinglist.openapi.metricsDoc
import com.shoppinglist.openapi.openApiDocs
import io.ktor.server.routing.openapi.describe
import com.shoppinglist.routes.listRoutes
import com.shoppinglist.routes.pushRoutes
import com.shoppinglist.models.HealthResponse
import com.shoppinglist.models.ErrorResponse
import io.modelcontextprotocol.kotlin.sdk.server.mcp

import com.shoppinglist.repository.PushSubscriptionRepository
import com.shoppinglist.services.PushNotificationService

fun Application.configureRouting(
    pushRepository: PushSubscriptionRepository? = null,
    pushNotificationService: PushNotificationService? = null,
    enableMcp: Boolean = false
) {
    routing {
        get("/") {
            call.respondText("Shared Shopping List API")
        }
        
        route("/api") {
            get("/health") {
                try {
                    val dbStatus = try {
                        com.shoppinglist.database.DatabaseFactory.testConnection()
                        "healthy"
                    } catch (e: Exception) {
                        "unhealthy: ${e.message}"
                    }
                    
                    val healthResponse = HealthResponse(
                        status = "OK",
                        timestamp = System.currentTimeMillis(),
                        database = dbStatus,
                        version = "5.0.0"
                    )
                    
                    call.respond(healthResponse)
                } catch (e: Exception) {
                    call.respond(
                        status = HttpStatusCode.ServiceUnavailable,
                        message = ErrorResponse(
                            status = "ERROR",
                            message = e.message ?: "Unknown error"
                        )
                    )
                }
            }.describe(healthDoc)
            
            get("/metrics") {
                call.respond(appMicrometerRegistry.scrape())
            }.describe(metricsDoc)
            
            if (pushRepository != null) {
                pushRoutes(pushRepository)
            }
            listRoutes(pushNotificationService)
            // Swagger UI at /api/docs, OpenAPI document generated from the routes above
            openApiDocs()
        }

        // MCP (Model Context Protocol) endpoint for AI assistant integration
        // Accessible via SSE transport at /mcp
        // DNS rebinding protection disabled since Shoppimo is designed for LAN access
        if (enableMcp) {
            route("/mcp") {
                mcp(enableDnsRebindingProtection = false) {
                    // Resolve WebSocket service lazily (set after configureWebSockets runs)
                    val wsService = call.application.attributes.getOrNull(WebSocketServiceKey)
                    McpServerConfig.createServer(wsService)
                }
            }
        }
    }
}
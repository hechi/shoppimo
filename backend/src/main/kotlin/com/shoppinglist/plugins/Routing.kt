package com.shoppinglist.plugins

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import com.shoppinglist.routes.listRoutes
import com.shoppinglist.models.HealthResponse
import com.shoppinglist.models.ErrorResponse
import com.shoppinglist.models.MetricsResponse
import com.shoppinglist.models.MemoryInfo

fun Application.configureRouting() {
    routing {
        get("/") {
            call.respondText("Shared Shopping List API")
        }
        
        route("/api") {
            get("/health") {
                // Enhanced health check with database connectivity
                try {
                    // Simple database connectivity check
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
            }
            
            get("/metrics") {
                // Basic metrics endpoint for monitoring
                try {
                    val runtime = Runtime.getRuntime()
                    val memoryInfo = MemoryInfo(
                        total = runtime.totalMemory(),
                        free = runtime.freeMemory(),
                        used = runtime.totalMemory() - runtime.freeMemory(),
                        max = runtime.maxMemory()
                    )
                    
                    val metrics = MetricsResponse(
                        timestamp = System.currentTimeMillis(),
                        uptime = java.lang.management.ManagementFactory.getRuntimeMXBean().uptime,
                        memory = memoryInfo,
                        threads = java.lang.management.ManagementFactory.getThreadMXBean().threadCount,
                        database = try {
                            com.shoppinglist.database.DatabaseFactory.testConnection()
                            "connected"
                        } catch (e: Exception) {
                            "disconnected"
                        }
                    )
                    
                    call.respond(metrics)
                } catch (e: Exception) {
                    call.respond(
                        status = HttpStatusCode.InternalServerError,
                        message = ErrorResponse(
                            status = "ERROR",
                            message = e.message ?: "Unknown error"
                        )
                    )
                }
            }
            
            listRoutes()
        }
    }
}
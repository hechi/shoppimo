package com.shoppinglist.plugins

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import com.shoppinglist.routes.listRoutes
import com.shoppinglist.routes.pushRoutes
import com.shoppinglist.models.HealthResponse
import com.shoppinglist.models.ErrorResponse
import com.shoppinglist.models.MetricsResponse
import com.shoppinglist.models.MemoryInfo
import com.shoppinglist.repository.PushSubscriptionRepository
import com.shoppinglist.services.PushNotificationService

fun Application.configureRouting(
    pushRepository: PushSubscriptionRepository? = null,
    pushNotificationService: PushNotificationService? = null
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
            }
            
            get("/metrics") {
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
            
            if (pushRepository != null) {
                pushRoutes(pushRepository)
            }
            listRoutes(pushNotificationService)
        }
    }
}
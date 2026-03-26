package com.shoppinglist.plugins

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.http.*
import com.shoppinglist.routes.listRoutes
import com.shoppinglist.routes.pushRoutes
import com.shoppinglist.models.HealthResponse
import com.shoppinglist.models.ErrorResponse

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
                call.respond(appMicrometerRegistry.scrape())
            }
            
            if (pushRepository != null) {
                pushRoutes(pushRepository)
            }
            listRoutes(pushNotificationService)
        }
    }
}
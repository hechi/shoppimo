package com.shoppinglist.routes

import com.shoppinglist.repository.PushSubscriptionRepository
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable
import java.util.*

@Serializable
data class SubscribeRequest(
    val listId: String,
    val endpoint: String,
    val p256dh: String,
    val auth: String,
    val deviceId: String
)

@Serializable
data class UnsubscribeRequest(
    val listId: String? = null,
    val endpoint: String? = null
)

@Serializable
data class VapidKeyResponse(val publicKey: String)

@Serializable
data class SubscribeResponse(val subscribed: Boolean)

@Serializable
data class UnsubscribeResponse(val unsubscribed: Boolean)

fun Route.pushRoutes(pushRepository: PushSubscriptionRepository) {
    route("/push") {
        get("/vapid-key") {
            val publicKey = System.getenv("VAPID_PUBLIC_KEY") ?: ""
            call.respond(HttpStatusCode.OK, VapidKeyResponse(publicKey))
        }

        post("/subscribe") {
            val request = try {
                call.receive<SubscribeRequest>()
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("invalid_request", "Invalid request body")
                )
                return@post
            }

            val listId = try {
                UUID.fromString(request.listId)
            } catch (e: IllegalArgumentException) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("invalid_list_id", "Invalid UUID format for list ID")
                )
                return@post
            }

            pushRepository.subscribe(
                listId = listId,
                endpoint = request.endpoint,
                p256dh = request.p256dh,
                auth = request.auth,
                deviceId = request.deviceId
            )

            call.respond(HttpStatusCode.Created, SubscribeResponse(subscribed = true))
        }

        post("/unsubscribe") {
            val request = try {
                call.receive<UnsubscribeRequest>()
            } catch (e: Exception) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("invalid_request", "Invalid request body")
                )
                return@post
            }

            val endpoint = request.endpoint
            if (endpoint.isNullOrBlank()) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("missing_endpoint", "endpoint is required")
                )
                return@post
            }

            val listId = try {
                UUID.fromString(request.listId ?: "")
            } catch (e: IllegalArgumentException) {
                call.respond(
                    HttpStatusCode.BadRequest,
                    ErrorResponse("invalid_list_id", "Invalid UUID format for list ID")
                )
                return@post
            }

            pushRepository.unsubscribe(endpoint = endpoint, listId = listId)

            call.respond(HttpStatusCode.OK, UnsubscribeResponse(unsubscribed = true))
        }
    }
}

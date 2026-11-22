package com.shoppinglist.openapi

import com.shoppinglist.models.CreateItemRequest
import com.shoppinglist.models.CreateShoppingListRequest
import com.shoppinglist.models.HealthResponse
import com.shoppinglist.models.ListItem
import com.shoppinglist.models.ShoppingList
import com.shoppinglist.models.UpdateAliasRequest
import com.shoppinglist.models.UpdateItemRequest
import com.shoppinglist.routes.ClearCompletedResponse
import com.shoppinglist.routes.ErrorResponse
import com.shoppinglist.routes.SubscribeRequest
import com.shoppinglist.routes.SubscribeResponse
import com.shoppinglist.routes.UnsubscribeRequest
import com.shoppinglist.routes.UnsubscribeResponse
import com.shoppinglist.routes.VapidKeyResponse
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.openapi.Operation
import io.ktor.openapi.jsonSchema

/**
 * OpenAPI operation descriptions for the REST endpoints.
 * Applied to routes with `Route.describe(...)`.
 */
typealias OperationDoc = Operation.Builder.() -> Unit

private const val LISTS_TAG = "Lists"
private const val ITEMS_TAG = "Items"
private const val PUSH_TAG = "Push"
private const val SYSTEM_TAG = "System"

private fun Operation.Builder.listIdParameter() {
    parameters {
        path("id") {
            description = "UUID of the shopping list."
        }
    }
}

private fun Operation.Builder.deviceIdParameter() {
    parameters {
        query("deviceId") {
            description = "Identifier of the calling device. Push notifications are not sent to this device."
            required = false
        }
    }
}

val healthDoc: OperationDoc = {
    tag(SYSTEM_TAG)
    summary = "Health check"
    description = "Reports service status and database connectivity."
    responses {
        HttpStatusCode.OK {
            description = "Service is running. The `database` field is `healthy` or `unhealthy: <reason>`."
            schema = jsonSchema<HealthResponse>()
        }
        HttpStatusCode.ServiceUnavailable {
            description = "Health check failed."
        }
    }
}

val metricsDoc: OperationDoc = {
    tag(SYSTEM_TAG)
    summary = "Prometheus metrics"
    description = "Application metrics in the Prometheus text exposition format."
    responses {
        HttpStatusCode.OK {
            description = "Metrics in Prometheus text format."
            ContentType.Text.Plain()
        }
    }
}

val createListDoc: OperationDoc = {
    tag(LISTS_TAG)
    summary = "Create a shopping list"
    description = "Creates an empty list. The body is optional. Without an `id`, the server generates a random UUID."
    requestBody {
        description = "Optional body with a client-chosen list UUID."
        required = false
        schema = jsonSchema<CreateShoppingListRequest>()
    }
    responses {
        HttpStatusCode.Created {
            description = "The created list."
            schema = jsonSchema<ShoppingList>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid request body (`invalid_request`) or invalid UUID (`invalid_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val getListDoc: OperationDoc = {
    tag(LISTS_TAG)
    summary = "Get a shopping list"
    description = "Returns a list with all its items."
    listIdParameter()
    responses {
        HttpStatusCode.OK {
            description = "The list and its items."
            schema = jsonSchema<ShoppingList>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List does not exist (`list_not_found`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val getListByAliasDoc: OperationDoc = {
    tag(LISTS_TAG)
    summary = "Resolve a list alias"
    description = "Looks up a list by its human-readable alias. The alias is trimmed and lowercased before lookup."
    parameters {
        path("alias") {
            description = "Alias of the list, for example `groceries`."
        }
    }
    responses {
        HttpStatusCode.OK {
            description = "The list that uses this alias."
            schema = jsonSchema<ShoppingList>()
        }
        HttpStatusCode.BadRequest {
            description = "Alias is missing or blank (`missing_alias`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "No list uses this alias (`list_not_found`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val updateAliasDoc: OperationDoc = {
    tag(LISTS_TAG)
    summary = "Set, change or remove a list alias"
    description = "Alias rules: 1-64 characters, lowercase letters, digits and hyphens, " +
        "no leading or trailing hyphen, not in UUID format, unique across lists. " +
        "Send `null` or omit `alias` to remove it."
    listIdParameter()
    requestBody {
        required = true
        schema = jsonSchema<UpdateAliasRequest>()
    }
    responses {
        HttpStatusCode.OK {
            description = "The updated list."
            schema = jsonSchema<ShoppingList>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_id`), invalid body (`invalid_request`) or invalid alias (`invalid_alias`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List does not exist (`list_not_found`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.Conflict {
            description = "Alias is used by another list (`alias_taken`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val addItemDoc: OperationDoc = {
    tag(ITEMS_TAG)
    summary = "Add an item"
    description = "Adds an item to the list and broadcasts an `ITEM_ADDED` WebSocket message."
    listIdParameter()
    deviceIdParameter()
    requestBody {
        required = true
        schema = jsonSchema<CreateItemRequest>()
    }
    responses {
        HttpStatusCode.Created {
            description = "The created item."
            schema = jsonSchema<ListItem>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_id`), invalid body (`invalid_request`) or blank text (`invalid_text`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List does not exist (`list_not_found`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val updateItemDoc: OperationDoc = {
    tag(ITEMS_TAG)
    summary = "Update an item"
    description = "Changes the text and/or completed state of an item. Omitted fields stay unchanged. " +
        "Broadcasts an `ITEM_UPDATED` WebSocket message."
    parameters {
        path("id") {
            description = "UUID of the shopping list."
        }
        path("itemId") {
            description = "UUID of the item."
        }
    }
    deviceIdParameter()
    requestBody {
        required = true
        schema = jsonSchema<UpdateItemRequest>()
    }
    responses {
        HttpStatusCode.OK {
            description = "The updated item."
            schema = jsonSchema<ListItem>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_list_id`, `invalid_item_id`), invalid body (`invalid_request`) " +
                "or blank text (`invalid_text`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List (`list_not_found`) or item (`item_not_found`) does not exist."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val deleteItemDoc: OperationDoc = {
    tag(ITEMS_TAG)
    summary = "Delete an item"
    description = "Deletes an item and broadcasts an `ITEM_DELETED` WebSocket message."
    parameters {
        path("id") {
            description = "UUID of the shopping list."
        }
        path("itemId") {
            description = "UUID of the item."
        }
    }
    deviceIdParameter()
    responses {
        HttpStatusCode.NoContent {
            description = "Item deleted."
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_list_id`, `invalid_item_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List (`list_not_found`) or item (`item_not_found`) does not exist."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val clearCompletedDoc: OperationDoc = {
    tag(ITEMS_TAG)
    summary = "Clear completed items"
    description = "Deletes all completed items of the list and broadcasts an `ITEMS_CLEARED` WebSocket message."
    listIdParameter()
    deviceIdParameter()
    responses {
        HttpStatusCode.OK {
            description = "Number of deleted items."
            schema = jsonSchema<ClearCompletedResponse>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid UUID (`invalid_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.NotFound {
            description = "List does not exist (`list_not_found`)."
            schema = jsonSchema<ErrorResponse>()
        }
        HttpStatusCode.InternalServerError {
            description = "Unexpected server error (`server_error`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val vapidKeyDoc: OperationDoc = {
    tag(PUSH_TAG)
    summary = "Get the VAPID public key"
    description = "Returns the public key the browser needs to create a Web Push subscription. " +
        "The key is empty when push is not configured on the server."
    responses {
        HttpStatusCode.OK {
            description = "The VAPID public key."
            schema = jsonSchema<VapidKeyResponse>()
        }
    }
}

val subscribeDoc: OperationDoc = {
    tag(PUSH_TAG)
    summary = "Subscribe to push notifications"
    description = "Registers a Web Push subscription for a list."
    requestBody {
        required = true
        schema = jsonSchema<SubscribeRequest>()
    }
    responses {
        HttpStatusCode.Created {
            description = "Subscription stored."
            schema = jsonSchema<SubscribeResponse>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid body (`invalid_request`) or invalid list UUID (`invalid_list_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

val unsubscribeDoc: OperationDoc = {
    tag(PUSH_TAG)
    summary = "Unsubscribe from push notifications"
    description = "Removes the Web Push subscription identified by `endpoint` and `listId`."
    requestBody {
        required = true
        schema = jsonSchema<UnsubscribeRequest>()
    }
    responses {
        HttpStatusCode.OK {
            description = "Subscription removed."
            schema = jsonSchema<UnsubscribeResponse>()
        }
        HttpStatusCode.BadRequest {
            description = "Invalid body (`invalid_request`), missing endpoint (`missing_endpoint`) " +
                "or invalid list UUID (`invalid_list_id`)."
            schema = jsonSchema<ErrorResponse>()
        }
    }
}

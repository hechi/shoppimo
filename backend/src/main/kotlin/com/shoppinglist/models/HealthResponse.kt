package com.shoppinglist.models

import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(
    val status: String,
    val timestamp: Long,
    val database: String,
    val version: String
)

@Serializable
data class ErrorResponse(
    val status: String,
    val message: String
)
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

@Serializable
data class MemoryInfo(
    val total: Long,
    val free: Long,
    val used: Long,
    val max: Long
)

@Serializable
data class MetricsResponse(
    val timestamp: Long,
    val uptime: Long,
    val memory: MemoryInfo,
    val threads: Int,
    val database: String
)
package com.shoppinglist.plugins

import com.shoppinglist.database.ShoppingLists
import io.ktor.server.application.*
import io.ktor.server.metrics.micrometer.*
import io.micrometer.core.instrument.Gauge
import io.micrometer.core.instrument.binder.jvm.JvmGcMetrics
import io.micrometer.core.instrument.binder.jvm.JvmMemoryMetrics
import io.micrometer.core.instrument.binder.jvm.JvmThreadMetrics
import io.micrometer.core.instrument.binder.system.ProcessorMetrics
import io.micrometer.prometheus.PrometheusConfig
import io.micrometer.prometheus.PrometheusMeterRegistry
import org.jetbrains.exposed.sql.selectAll
import org.jetbrains.exposed.sql.transactions.transaction
import java.util.concurrent.atomic.AtomicLong

lateinit var appMicrometerRegistry: PrometheusMeterRegistry
    private set

// Falls back to last known value when the DB query fails inside the gauge supplier
private val cachedListCount = AtomicLong(0)

fun Application.configureMetrics() {
    appMicrometerRegistry = PrometheusMeterRegistry(PrometheusConfig.DEFAULT)

    install(MicrometerMetrics) {
        registry = appMicrometerRegistry
        meterBinders = listOf(
            JvmMemoryMetrics(),
            JvmGcMetrics(),
            JvmThreadMetrics(),
            ProcessorMetrics()
        )
    }

    Gauge.builder("shoppimo_websocket_connections_total", this) { app ->
        try {
            val wsService = app.attributes.getOrNull(WebSocketServiceKey)
            wsService?.getConnectionManager()
                ?.getActiveListIds()
                ?.sumOf { listId -> wsService.getConnectionManager().getConnectionCount(listId) }
                ?.toDouble()
                ?: 0.0
        } catch (_: Exception) {
            0.0
        }
    }
        .description("Total number of active WebSocket connections across all lists")
        .register(appMicrometerRegistry)

    Gauge.builder("shoppimo_shopping_lists_total", cachedListCount) { cached ->
        try {
            val count = transaction { ShoppingLists.selectAll().count() }
            cached.set(count)
            count.toDouble()
        } catch (_: Exception) {
            cached.get().toDouble()
        }
    }
        .description("Total number of shopping lists in the database")
        .register(appMicrometerRegistry)
}

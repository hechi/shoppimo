package com.shoppinglist

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import com.shoppinglist.plugins.*
import com.shoppinglist.database.DatabaseFactory
import com.shoppinglist.service.CleanupService

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    DatabaseFactory.init()
    configureSerialization()
    configureCORS()
    configureRouting()
    configureWebSockets()
    
    // Start the cleanup service
    val cleanupService = CleanupService()
    cleanupService.startCleanupScheduler()
    
    // Stop cleanup service when application stops
    environment.monitor.subscribe(ApplicationStopped) {
        cleanupService.stopCleanupScheduler()
    }
}
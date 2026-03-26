package com.shoppinglist

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import com.shoppinglist.plugins.*
import com.shoppinglist.database.DatabaseFactory
import com.shoppinglist.repository.PushSubscriptionRepositoryImpl
import com.shoppinglist.service.CleanupService
import com.shoppinglist.services.PushNotificationService
import com.shoppinglist.util.loadDotEnv

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0", module = Application::module)
        .start(wait = true)
}

fun Application.module() {
    loadDotEnv()
    DatabaseFactory.init()
    configureSerialization()
    configureCORS()

    val pushRepository = PushSubscriptionRepositoryImpl()
    val pushService = runCatching {
        PushNotificationService.fromEnvironment(pushRepository)
    }.getOrNull()

    configureRouting(
        pushRepository = pushRepository,
        pushNotificationService = pushService
    )
    configureWebSockets()
    
    val cleanupService = CleanupService()
    cleanupService.startCleanupScheduler()
    
    environment.monitor.subscribe(ApplicationStopped) {
        cleanupService.stopCleanupScheduler()
    }
}
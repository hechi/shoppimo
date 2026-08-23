package com.shoppinglist.mcp

import com.shoppinglist.websocket.WebSocketService
import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ServerCapabilities
import org.slf4j.LoggerFactory

/**
 * Creates and configures the Shoppimo MCP server instance.
 * Registers all tools and resources for AI assistant integration.
 */
object McpServerConfig {

    private val logger = LoggerFactory.getLogger(McpServerConfig::class.java)
    private const val SERVER_NAME = "shoppimo"
    private const val SERVER_VERSION = "5.0.0"

    fun createServer(webSocketService: WebSocketService? = null): Server {
        logger.info("Creating MCP server instance: $SERVER_NAME v$SERVER_VERSION")

        val server = Server(
            serverInfo = Implementation(
                name = SERVER_NAME,
                version = SERVER_VERSION
            ),
            options = ServerOptions(
                capabilities = ServerCapabilities(
                    tools = ServerCapabilities.Tools(listChanged = true),
                    resources = ServerCapabilities.Resources(
                        subscribe = false,
                        listChanged = true
                    )
                )
            )
        )

        // Register tools and resources
        ShoppimoTools.register(server, webSocketService)
        ShoppimoResources.register(server)

        logger.info("MCP server configured with {} tools and resource templates", 9)
        return server
    }
}

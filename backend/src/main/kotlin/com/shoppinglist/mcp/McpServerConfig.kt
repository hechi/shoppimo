package com.shoppinglist.mcp

import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.server.ServerOptions
import io.modelcontextprotocol.kotlin.sdk.types.Implementation
import io.modelcontextprotocol.kotlin.sdk.types.ServerCapabilities

/**
 * Creates and configures the Shoppimo MCP server instance.
 * Registers all tools and resources for AI assistant integration.
 */
object McpServerConfig {

    private const val SERVER_NAME = "shoppimo"
    private const val SERVER_VERSION = "5.0.0"

    fun createServer(): Server {
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
        ShoppimoTools.register(server)
        ShoppimoResources.register(server)

        return server
    }
}

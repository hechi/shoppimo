package com.shoppinglist.util

import java.io.File

fun loadDotEnv(path: String = ".env") {
    val file = File(path)
    if (!file.exists()) return

    file.forEachLine { line ->
        val trimmed = line.trim()
        if (trimmed.isEmpty() || trimmed.startsWith("#")) return@forEachLine

        val eqIndex = trimmed.indexOf('=')
        if (eqIndex < 1) return@forEachLine

        val key = trimmed.substring(0, eqIndex).trim()
        val raw = trimmed.substring(eqIndex + 1).trim()
        // Strip surrounding quotes if present ("value" or 'value')
        val value = if (raw.length >= 2 &&
            ((raw.startsWith('"') && raw.endsWith('"')) ||
             (raw.startsWith('\'') && raw.endsWith('\'')))
        ) raw.substring(1, raw.length - 1) else raw

        // OS environment variables take priority — only set if not already present
        if (System.getenv(key) == null) {
            System.setProperty(key, value)
        }
    }
}

fun getEnv(key: String): String? = System.getenv(key) ?: System.getProperty(key)

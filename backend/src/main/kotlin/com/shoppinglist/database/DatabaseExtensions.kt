package com.shoppinglist.database

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.jetbrains.exposed.v1.jdbc.Database
import org.jetbrains.exposed.v1.jdbc.JdbcTransaction
import org.jetbrains.exposed.v1.jdbc.transactions.suspendTransaction

/**
 * Runs [block] in a database transaction on [Dispatchers.IO].
 *
 * Replaces Exposed's deprecated `dbQuery`. `suspendTransaction` does not switch
 * dispatchers itself, so the blocking JDBC work is moved off the caller's thread here.
 */
suspend fun <T> dbQuery(db: Database? = null, block: suspend JdbcTransaction.() -> T): T =
    withContext(Dispatchers.IO) { suspendTransaction(db = db) { block() } }

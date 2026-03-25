package com.shoppinglist.repository

import com.shoppinglist.database.PushSubscriptions
import com.shoppinglist.models.PushSubscription
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.time.Instant
import java.util.*

class PushSubscriptionRepositoryImpl : PushSubscriptionRepository {

    override suspend fun subscribe(
        listId: UUID,
        endpoint: String,
        p256dh: String,
        auth: String,
        deviceId: String
    ): PushSubscription = newSuspendedTransaction {
        val existing = PushSubscriptions.select {
            (PushSubscriptions.endpoint eq endpoint) and (PushSubscriptions.listId eq listId)
        }.singleOrNull()

        if (existing != null) {
            val subscriptionId = existing[PushSubscriptions.id]
            PushSubscriptions.update({ PushSubscriptions.id eq subscriptionId }) {
                it[PushSubscriptions.p256dhKey] = p256dh
                it[PushSubscriptions.authKey] = auth
                it[PushSubscriptions.deviceId] = deviceId
                it[PushSubscriptions.consecutiveFailures] = 0
            }

            PushSubscription(
                id = subscriptionId.toString(),
                listId = listId.toString(),
                endpoint = endpoint,
                p256dhKey = p256dh,
                authKey = auth,
                deviceId = deviceId,
                createdAt = existing[PushSubscriptions.createdAt].toString(),
                consecutiveFailures = 0
            )
        } else {
            val subscriptionId = UUID.randomUUID()
            val now = Instant.now()

            PushSubscriptions.insert {
                it[id] = subscriptionId
                it[PushSubscriptions.listId] = listId
                it[PushSubscriptions.endpoint] = endpoint
                it[PushSubscriptions.p256dhKey] = p256dh
                it[PushSubscriptions.authKey] = auth
                it[PushSubscriptions.deviceId] = deviceId
                it[createdAt] = now
                it[consecutiveFailures] = 0
            }

            PushSubscription(
                id = subscriptionId.toString(),
                listId = listId.toString(),
                endpoint = endpoint,
                p256dhKey = p256dh,
                authKey = auth,
                deviceId = deviceId,
                createdAt = now.toString(),
                consecutiveFailures = 0
            )
        }
    }

    override suspend fun unsubscribe(endpoint: String, listId: UUID): Boolean = newSuspendedTransaction {
        val deleted = PushSubscriptions.deleteWhere {
            (PushSubscriptions.endpoint eq endpoint) and (PushSubscriptions.listId eq listId)
        }
        deleted > 0
    }

    override suspend fun getSubscriptionsForList(listId: UUID): List<PushSubscription> = newSuspendedTransaction {
        PushSubscriptions.select { PushSubscriptions.listId eq listId }
            .map { row ->
                PushSubscription(
                    id = row[PushSubscriptions.id].toString(),
                    listId = row[PushSubscriptions.listId].toString(),
                    endpoint = row[PushSubscriptions.endpoint],
                    p256dhKey = row[PushSubscriptions.p256dhKey],
                    authKey = row[PushSubscriptions.authKey],
                    deviceId = row[PushSubscriptions.deviceId],
                    createdAt = row[PushSubscriptions.createdAt].toString(),
                    consecutiveFailures = row[PushSubscriptions.consecutiveFailures]
                )
            }
    }

    override suspend fun getSubscriptionsForListExcludingDevice(
        listId: UUID,
        deviceId: String
    ): List<PushSubscription> = newSuspendedTransaction {
        PushSubscriptions.select {
            (PushSubscriptions.listId eq listId) and (PushSubscriptions.deviceId neq deviceId)
        }
            .map { row ->
                PushSubscription(
                    id = row[PushSubscriptions.id].toString(),
                    listId = row[PushSubscriptions.listId].toString(),
                    endpoint = row[PushSubscriptions.endpoint],
                    p256dhKey = row[PushSubscriptions.p256dhKey],
                    authKey = row[PushSubscriptions.authKey],
                    deviceId = row[PushSubscriptions.deviceId],
                    createdAt = row[PushSubscriptions.createdAt].toString(),
                    consecutiveFailures = row[PushSubscriptions.consecutiveFailures]
                )
            }
    }

    override suspend fun incrementFailure(subscriptionId: UUID): Boolean = newSuspendedTransaction {
        val currentValue = PushSubscriptions
            .select { PushSubscriptions.id eq subscriptionId }
            .map { it[PushSubscriptions.consecutiveFailures] }
            .singleOrNull() ?: 0
        
        val updated = PushSubscriptions.update({ PushSubscriptions.id eq subscriptionId }) {
            it[PushSubscriptions.consecutiveFailures] = currentValue + 1
        }
        updated > 0
    }

    override suspend fun deleteSubscription(subscriptionId: UUID): Boolean = newSuspendedTransaction {
        val deleted = PushSubscriptions.deleteWhere { PushSubscriptions.id eq subscriptionId }
        deleted > 0
    }

    override suspend fun deleteStaleSubscriptions(maxFailures: Int): Int = newSuspendedTransaction {
        val allSubs = PushSubscriptions.selectAll().toList()
        var deleted = 0
        for (row in allSubs) {
            if (row[PushSubscriptions.consecutiveFailures] > maxFailures) {
                val id = row[PushSubscriptions.id]
                deleted += PushSubscriptions.deleteWhere { PushSubscriptions.id eq id }
            }
        }
        deleted
    }
}

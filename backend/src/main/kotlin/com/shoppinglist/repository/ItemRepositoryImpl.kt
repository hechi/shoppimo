package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.ListItem
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.experimental.newSuspendedTransaction
import java.time.Instant
import java.util.*

class ItemRepositoryImpl : ItemRepository {
    
    override suspend fun createItem(listId: UUID, text: String): ListItem = newSuspendedTransaction {
        val itemId = UUID.randomUUID()
        val now = Instant.now()
        val order = getNextOrderForList(listId)
        
        ListItems.insert {
            it[id] = itemId
            it[ListItems.listId] = listId
            it[ListItems.text] = text
            it[completed] = false
            it[createdAt] = now
            it[itemOrder] = order
        }
        
        // Update parent list's lastModified
        ShoppingLists.update({ ShoppingLists.id eq listId }) {
            it[lastModified] = now
        }
        
        ListItem(
            id = itemId.toString(),
            text = text,
            completed = false,
            createdAt = now.toString(),
            order = order
        )
    }
    
    override suspend fun getItemById(itemId: UUID): ListItem? = newSuspendedTransaction {
        ListItems.select { ListItems.id eq itemId }
            .singleOrNull()
            ?.let { row ->
                ListItem(
                    id = row[ListItems.id].toString(),
                    text = row[ListItems.text],
                    completed = row[ListItems.completed],
                    createdAt = row[ListItems.createdAt].toString(),
                    order = row[ListItems.itemOrder]
                )
            }
    }
    
    override suspend fun getItemsByListId(listId: UUID): List<ListItem> = newSuspendedTransaction {
        ListItems.select { ListItems.listId eq listId }
            .orderBy(ListItems.itemOrder)
            .map { row ->
                ListItem(
                    id = row[ListItems.id].toString(),
                    text = row[ListItems.text],
                    completed = row[ListItems.completed],
                    createdAt = row[ListItems.createdAt].toString(),
                    order = row[ListItems.itemOrder]
                )
            }
    }
    
    override suspend fun updateItem(itemId: UUID, text: String?, completed: Boolean?): ListItem? = newSuspendedTransaction {
        // First get the current item to get the listId
        val currentItem = ListItems.select { ListItems.id eq itemId }.singleOrNull()
            ?: return@newSuspendedTransaction null
        
        val listId = currentItem[ListItems.listId]
        val now = Instant.now()
        
        // Update the item
        ListItems.update({ ListItems.id eq itemId }) {
            text?.let { newText -> it[ListItems.text] = newText }
            completed?.let { newCompleted -> it[ListItems.completed] = newCompleted }
        }
        
        // Update parent list's lastModified
        ShoppingLists.update({ ShoppingLists.id eq listId }) {
            it[lastModified] = now
        }
        
        // Return updated item directly from the same transaction
        ListItems.select { ListItems.id eq itemId }
            .singleOrNull()
            ?.let { row ->
                ListItem(
                    id = row[ListItems.id].toString(),
                    text = row[ListItems.text],
                    completed = row[ListItems.completed],
                    createdAt = row[ListItems.createdAt].toString(),
                    order = row[ListItems.itemOrder]
                )
            }
    }
    
    override suspend fun deleteItem(itemId: UUID): Boolean = newSuspendedTransaction {
        // First get the listId to update parent list
        val item = ListItems.select { ListItems.id eq itemId }.singleOrNull()
            ?: return@newSuspendedTransaction false
        
        val listId = item[ListItems.listId]
        val now = Instant.now()
        
        // Delete the item
        val deletedRows = ListItems.deleteWhere { ListItems.id eq itemId }
        
        if (deletedRows > 0) {
            // Update parent list's lastModified
            ShoppingLists.update({ ShoppingLists.id eq listId }) {
                it[lastModified] = now
            }
        }
        
        deletedRows > 0
    }
    
    override suspend fun clearCompletedItems(listId: UUID): Int = newSuspendedTransaction {
        val now = Instant.now()
        
        // Delete completed items
        val deletedCount = ListItems.deleteWhere { 
            (ListItems.listId eq listId) and (completed eq true) 
        }
        
        if (deletedCount > 0) {
            // Update parent list's lastModified
            ShoppingLists.update({ ShoppingLists.id eq listId }) {
                it[lastModified] = now
            }
        }
        
        deletedCount
    }
    
    override suspend fun getNextOrderForList(listId: UUID): Int = newSuspendedTransaction {
        val maxOrder = ListItems
            .slice(ListItems.itemOrder.max())
            .select { ListItems.listId eq listId }
            .singleOrNull()
            ?.get(ListItems.itemOrder.max())
        
        (maxOrder ?: 0) + 1
    }
}
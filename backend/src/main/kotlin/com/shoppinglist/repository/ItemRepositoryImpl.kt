package com.shoppinglist.repository

import com.shoppinglist.database.ListItems
import com.shoppinglist.database.ShoppingLists
import com.shoppinglist.models.ListItem
import org.jetbrains.exposed.v1.core.*
import org.jetbrains.exposed.v1.jdbc.*
import org.jetbrains.exposed.v1.core.eq
import com.shoppinglist.database.dbQuery
import java.time.Instant
import java.util.*

class ItemRepositoryImpl : ItemRepository {
    
    override suspend fun createItem(listId: UUID, text: String): ListItem = dbQuery {
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
    
    override suspend fun getItemById(itemId: UUID): ListItem? = dbQuery {
        ListItems.selectAll().where { ListItems.id eq itemId }
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
    
    override suspend fun getItemsByListId(listId: UUID): List<ListItem> = dbQuery {
        ListItems.selectAll().where { ListItems.listId eq listId }
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
    
    override suspend fun updateItem(itemId: UUID, text: String?, completed: Boolean?): ListItem? = dbQuery {
        // First get the current item to get the listId
        val currentItem = ListItems.selectAll().where { ListItems.id eq itemId }.singleOrNull()
            ?: return@dbQuery null
        
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
        ListItems.selectAll().where { ListItems.id eq itemId }
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
    
    override suspend fun deleteItem(itemId: UUID): Boolean = dbQuery {
        // First get the listId to update parent list
        val item = ListItems.selectAll().where { ListItems.id eq itemId }.singleOrNull()
            ?: return@dbQuery false
        
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
    
    override suspend fun clearCompletedItems(listId: UUID): Int = dbQuery {
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
    
    override suspend fun getNextOrderForList(listId: UUID): Int = dbQuery {
        val maxOrder = ListItems
            .selectAll().where { ListItems.listId eq listId }
            .maxOfOrNull { it[ListItems.itemOrder] }
        
        (maxOrder ?: 0) + 1
    }
}

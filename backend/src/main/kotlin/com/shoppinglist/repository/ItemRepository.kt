package com.shoppinglist.repository

import com.shoppinglist.models.ListItem
import java.util.*

interface ItemRepository {
    suspend fun createItem(listId: UUID, text: String): ListItem
    suspend fun getItemById(itemId: UUID): ListItem?
    suspend fun getItemsByListId(listId: UUID): List<ListItem>
    suspend fun updateItem(itemId: UUID, text: String?, completed: Boolean?): ListItem?
    suspend fun deleteItem(itemId: UUID): Boolean
    suspend fun clearCompletedItems(listId: UUID): Int
    suspend fun getNextOrderForList(listId: UUID): Int
}
package com.shoppinglist.repository

import com.shoppinglist.models.ShoppingList
import java.util.*

interface ListRepository {
    suspend fun createList(id: UUID): ShoppingList
    suspend fun getListById(id: UUID): ShoppingList?
    suspend fun updateListModified(id: UUID): Boolean
    suspend fun deleteList(id: UUID): Boolean
    suspend fun listExists(id: UUID): Boolean
    suspend fun getListWithExpiration(id: UUID): ShoppingList?
    suspend fun getListByAlias(alias: String): ShoppingList?
    suspend fun updateAlias(id: UUID, alias: String?): Boolean
    suspend fun aliasExists(alias: String): Boolean
}

package com.shoppinglist.mcp

import io.modelcontextprotocol.kotlin.sdk.server.Server
import io.modelcontextprotocol.kotlin.sdk.types.GetPromptResult
import io.modelcontextprotocol.kotlin.sdk.types.PromptArgument
import io.modelcontextprotocol.kotlin.sdk.types.PromptMessage
import io.modelcontextprotocol.kotlin.sdk.types.Role
import io.modelcontextprotocol.kotlin.sdk.types.TextContent
import org.slf4j.LoggerFactory

/**
 * Registers MCP prompts (reusable AI workflow templates) with the Shoppimo server.
 * Prompts guide AI assistants through structured shopping list workflows.
 */
object ShoppimoPrompts {

    private val logger = LoggerFactory.getLogger(ShoppimoPrompts::class.java)

    /**
     * Common pantry essentials that most households already have.
     * These are excluded from meal-based shopping suggestions.
     */
    private val PANTRY_ESSENTIALS = listOf(
        "salt", "pepper", "olive oil", "vegetable oil", "sugar", "flour",
        "garlic", "onions", "butter", "baking powder", "baking soda",
        "vinegar", "soy sauce", "dried herbs", "paprika", "cumin",
        "cinnamon", "bay leaves", "cornstarch", "honey", "mustard"
    )

    fun register(server: Server) {
        registerWeeklyGroceries(server)
        registerSuggestMeals(server)
        logger.info("MCP prompts registered: weekly-groceries, suggest-meals")
    }

    private fun registerWeeklyGroceries(server: Server) {
        server.addPrompt(
            name = "weekly-groceries",
            description = "Populate a shopping list with typical weekly grocery staples. Skips pantry essentials (salt, pepper, oil, etc.) that most households already have.",
            arguments = listOf(
                PromptArgument(
                    name = "list_id",
                    description = "The UUID or alias of the shopping list to populate. If not provided, a new list will be created.",
                    required = false
                ),
                PromptArgument(
                    name = "household_size",
                    description = "Number of people in the household (default: 2).",
                    required = false
                ),
                PromptArgument(
                    name = "dietary_preferences",
                    description = "Dietary preferences or restrictions (e.g. 'vegetarian', 'gluten-free', 'low-carb').",
                    required = false
                )
            )
        ) { request ->
            val args = request.arguments ?: emptyMap()
            val listId = args["list_id"] ?: ""
            val householdSize = args["household_size"] ?: "2"
            val dietary = args["dietary_preferences"] ?: "none"

            val listContext = if (listId.isNotBlank()) {
                "Use the existing shopping list (ID or alias: '$listId'). Look it up with get_list or get_list_by_alias first."
            } else {
                "Create a new shopping list using create_list, then set a meaningful alias like 'weekly' or 'groceries'."
            }

            val promptText = """
                |You are a helpful shopping assistant for Shoppimo.
                |
                |Task: Populate a weekly grocery shopping list with staple items for a household of $householdSize people.
                |Dietary preferences: $dietary
                |
                |$listContext
                |
                |Guidelines:
                |- Add typical weekly staples: fresh produce, dairy, proteins, bread, snacks, beverages, cleaning supplies
                |- Scale quantities to household size
                |- Respect dietary preferences
                |- DO NOT add pantry essentials that most people already have: ${PANTRY_ESSENTIALS.joinToString(", ")}
                |- Use the add_items tool to add items in batch (more efficient than one-by-one)
                |- After adding items, share the list link: https://shoppimo.de/list/{listId}
                |
                |Format each item naturally (e.g. "Milk 1L", "Bananas", "Chicken breast 500g", "Whole wheat bread").
            """.trimMargin()

            GetPromptResult(
                description = "Weekly grocery shopping list template for $householdSize people",
                messages = listOf(
                    PromptMessage(
                        role = Role.User,
                        content = TextContent(text = promptText)
                    )
                )
            )
        }
    }

    private fun registerSuggestMeals(server: Server) {
        server.addPrompt(
            name = "suggest-meals",
            description = "Suggest meals for the week and add their ingredients to a shopping list. Excludes common pantry essentials (salt, pepper, oil, garlic, onions, etc.) since most people have these at home.",
            arguments = listOf(
                PromptArgument(
                    name = "list_id",
                    description = "The UUID or alias of the shopping list to add ingredients to. If not provided, a new list will be created.",
                    required = false
                ),
                PromptArgument(
                    name = "meal_count",
                    description = "Number of meals to suggest (default: 3).",
                    required = false
                ),
                PromptArgument(
                    name = "dietary_preferences",
                    description = "Dietary preferences or restrictions (e.g. 'vegetarian', 'vegan', 'gluten-free', 'low-carb', 'high-protein').",
                    required = false
                ),
                PromptArgument(
                    name = "cuisine",
                    description = "Preferred cuisine style (e.g. 'italian', 'asian', 'mexican', 'mediterranean', 'mixed').",
                    required = false
                )
            )
        ) { request ->
            val args = request.arguments ?: emptyMap()
            val listId = args["list_id"] ?: ""
            val mealCount = args["meal_count"] ?: "3"
            val dietary = args["dietary_preferences"] ?: "none"
            val cuisine = args["cuisine"] ?: "mixed"

            val listContext = if (listId.isNotBlank()) {
                "Use the existing shopping list (ID or alias: '$listId'). Look it up with get_list or get_list_by_alias first to see what's already on it."
            } else {
                "Create a new shopping list using create_list, then set a meaningful alias like 'meals-this-week'."
            }

            val promptText = """
                |You are a helpful meal planning and shopping assistant for Shoppimo.
                |
                |Task: Suggest $mealCount meals for this week and add the required ingredients to the shopping list.
                |Dietary preferences: $dietary
                |Cuisine preference: $cuisine
                |
                |$listContext
                |
                |Guidelines:
                |1. Suggest $mealCount concrete, easy-to-cook meals with variety (don't repeat proteins or base ingredients)
                |2. For each meal, list the specific ingredients needed
                |3. DO NOT add common pantry essentials that everyone has at home: ${PANTRY_ESSENTIALS.joinToString(", ")}
                |4. DO NOT add basic spices or condiments unless they are specialty items for the recipe
                |5. Combine duplicate ingredients across meals (e.g. if two meals need tomatoes, add once with total quantity)
                |6. Use the add_items tool to add all ingredients in batch
                |7. Format items with approximate quantities (e.g. "Cherry tomatoes 250g", "Pasta penne 500g", "Fresh basil")
                |
                |Response format:
                |- First, present the $mealCount meal suggestions with a brief description
                |- Then add all combined ingredients to the shopping list
                |- Finally, share the list link: https://shoppimo.de/list/{listId}
                |
                |Keep meals practical — things a home cook can make in 30-45 minutes with standard kitchen equipment.
            """.trimMargin()

            GetPromptResult(
                description = "Meal suggestions for the week with shopping list ingredients",
                messages = listOf(
                    PromptMessage(
                        role = Role.User,
                        content = TextContent(text = promptText)
                    )
                )
            )
        }
    }
}

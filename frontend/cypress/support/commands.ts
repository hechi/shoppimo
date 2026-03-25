/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      createList(): Chainable<string>
      addItem(text: string): Chainable<void>
      toggleItem(text: string): Chainable<void>
      deleteItem(text: string): Chainable<void>
    }
  }
}

// Custom command to create a new list and return the list ID
Cypress.Commands.add('createList', () => {
  cy.visit('/')
  cy.get('button').contains('Create New List').click()
  cy.url().should('match', /\/list\/[a-f0-9-]{36}$/)
  cy.url().then((url) => {
    const listId = url.split('/list/')[1]
    return cy.wrap(listId)
  })
})

// Custom command to add an item to the current list
Cypress.Commands.add('addItem', (text: string) => {
  cy.get('input[placeholder="Add new item..."]').type(text)
  cy.get('button').contains('Add Item').click()
  cy.get('input[placeholder="Add new item..."]').should('have.value', '')
})

// Custom command to toggle an item's completion status
Cypress.Commands.add('toggleItem', (text: string) => {
  cy.contains(text).parent().find('input[type="checkbox"]').click()
})

// Custom command to delete an item
Cypress.Commands.add('deleteItem', (text: string) => {
  cy.contains(text).parent().find('button[title="Delete item"]').click()
  cy.get('button').contains('Delete').click()
})
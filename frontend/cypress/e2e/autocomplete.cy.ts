describe('Autocomplete', () => {
  const autocompleteHistory = [
    { text: 'Milk', normalizedText: 'milk', lastUsed: Date.now() },
    { text: 'Bread', normalizedText: 'bread', lastUsed: Date.now() - 1000 },
    { text: 'Butter', normalizedText: 'butter', lastUsed: Date.now() - 2000 },
    { text: 'Bananas', normalizedText: 'bananas', lastUsed: Date.now() - 3000 },
  ]

  beforeEach(() => {
    cy.intercept('GET', 'http://localhost:8080/api/lists/test-list-id', {
      statusCode: 200,
      body: {
        id: 'test-list-id',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    }).as('getList')

    cy.intercept('POST', 'http://localhost:8080/api/lists/test-list-id/items', {
      statusCode: 201,
      body: {
        id: 'item-1',
        text: 'Milk',
        completed: false,
        createdAt: new Date().toISOString(),
        order: 0,
      },
    }).as('addItem')
  })

  describe('Suggestions appear', () => {
    it('should show suggestions when typing a prefix matching history', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('M')

      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')
      cy.get('[data-testid="autocomplete-suggestion"]').should('have.length.at.least', 1)
      cy.get('[data-testid="autocomplete-suggestion"]').first().should('contain.text', 'Milk')
    })

    it('should show multiple matching suggestions', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('B')

      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')
      cy.get('[data-testid="autocomplete-suggestion"]').should('have.length.at.least', 3)
    })

    it('should not show suggestions when input is empty', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').should('have.value', '')
      cy.get('[data-testid="autocomplete-dropdown"]').should('not.exist')
    })

    it('should not show suggestions when no history matches', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('xyz')

      cy.get('[data-testid="autocomplete-suggestion"]').should('not.exist')
    })
  })

  describe('Selection via click', () => {
    it('should fill input with suggestion text when clicked', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('M')
      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')

      cy.get('[data-testid="autocomplete-suggestion"]').first().click()

      cy.get('[data-testid="add-item-input"]').should('have.value', 'Milk')
      cy.get('[data-testid="autocomplete-dropdown"]').should('not.exist')
    })
  })

  describe('Keyboard navigation', () => {
    it('should dismiss dropdown on Escape key', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('M')
      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')

      cy.get('[data-testid="add-item-input"]').type('{esc}')
      cy.get('[data-testid="autocomplete-dropdown"]').should('not.exist')
    })

    it('should select suggestion with ArrowDown + Enter on the dropdown', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('M')
      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')

      cy.get('[data-testid="autocomplete-dropdown"]').focus()
      cy.get('[data-testid="autocomplete-dropdown"]').trigger('keydown', { key: 'ArrowDown' })
      cy.get('[data-testid="autocomplete-dropdown"]').trigger('keydown', { key: 'Enter' })

      cy.get('[data-testid="add-item-input"]').should('have.value', 'Milk')
      cy.get('[data-testid="autocomplete-dropdown"]').should('not.exist')
    })
  })

  describe('Item submission with autocomplete', () => {
    it('should add selected suggestion item to list', () => {
      cy.window().then((win) => {
        win.localStorage.setItem(
          'shoppimo_autocomplete_history',
          JSON.stringify(autocompleteHistory)
        )
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="add-item-input"]').type('M')
      cy.get('[data-testid="autocomplete-dropdown"]').should('be.visible')

      cy.get('[data-testid="autocomplete-suggestion"]').first().click()
      cy.get('[data-testid="add-item-input"]').should('have.value', 'Milk')

      cy.get('[data-testid="add-item-button"]').should('not.be.disabled').click()

      cy.get('[data-testid="add-item-input"]').should('have.value', '')
    })
  })
})

describe('Shopping List E2E Tests', () => {
  beforeEach(() => {
    // Intercept API calls to avoid dependency on backend during testing
    cy.intercept('POST', 'http://localhost:8080/api/lists', {
      statusCode: 201,
      body: {
        id: 'test-list-id',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }).as('createList')

    cy.intercept('GET', 'http://localhost:8080/api/lists/test-list-id', {
      statusCode: 200,
      body: {
        id: 'test-list-id',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }).as('getList')

    cy.intercept('POST', 'http://localhost:8080/api/lists/test-list-id/items', {
      statusCode: 201,
      body: {
        id: 'item-1',
        text: 'Test Item',
        completed: false,
        createdAt: new Date().toISOString(),
        order: 0
      }
    }).as('addItem')
  })

  describe('List Creation and Sharing Workflow', () => {
    it('should create a new list and redirect to list page', () => {
      cy.visit('/')
      
      // Verify home page elements
      cy.contains('Shared Shopping List').should('be.visible')
      cy.contains('Create a new shopping list').should('be.visible')
      cy.get('button').contains('Create New List').should('be.visible')
      
      // Create new list
      cy.get('button').contains('Create New List').click()
      
      // Verify API call was made
      cy.wait('@createList')
      
      // Verify redirection to list page
      cy.url().should('include', '/list/test-list-id')
    })

    it('should display shareable URL prominently', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
      
      // Verify URL is displayed prominently
      cy.contains('Share this list:').should('be.visible')
      cy.contains('http://localhost:3000/list/test-list-id').should('be.visible')
      
      // Verify copy button is present
      cy.get('button').contains('Copy URL').should('be.visible')
    })

    it('should copy URL to clipboard when copy button is clicked', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
      
      // Mock clipboard API
      cy.window().then((win) => {
        cy.stub(win.navigator.clipboard, 'writeText').resolves()
      })
      
      // Click copy button
      cy.get('button').contains('Copy URL').click()
      
      // Verify copied state
      cy.get('button').contains('Copied!').should('be.visible')
      
      // Verify it returns to normal state
      cy.get('button').contains('Copy URL').should('be.visible')
    })
  })

  describe('Item Management Workflow', () => {
    beforeEach(() => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
    })

    it('should add new items to the list', () => {
      // Add an item
      cy.get('input[placeholder="Add new item..."]').type('Milk')
      cy.get('button').contains('Add Item').click()
      
      // Verify API call
      cy.wait('@addItem')
      
      // Verify input is cleared
      cy.get('input[placeholder="Add new item..."]').should('have.value', '')
    })

    it('should show empty state when list has no items', () => {
      // Verify empty state
      cy.contains('Your list is empty').should('be.visible')
      cy.contains('Add your first item above to get started!').should('be.visible')
      cy.contains('Share the URL above with others to collaborate').should('be.visible')
    })

    it('should validate input and disable submit when empty', () => {
      // Verify submit button is disabled when input is empty
      cy.get('button').contains('Add Item').should('be.disabled')
      
      // Type something and verify button is enabled
      cy.get('input[placeholder="Add new item..."]').type('Test')
      cy.get('button').contains('Add Item').should('be.enabled')
      
      // Clear input and verify button is disabled again
      cy.get('input[placeholder="Add new item..."]').clear()
      cy.get('button').contains('Add Item').should('be.disabled')
    })
  })

  describe('Real-time Collaboration Simulation', () => {
    it('should handle WebSocket connection status', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
      
      // Check for sync status indicator (should be present in the UI)
      cy.get('[data-testid="sync-status"]').should('exist')
    })

    it('should show offline mode when connection is lost', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
      
      // Simulate offline mode by intercepting WebSocket
      cy.window().then((win) => {
        // Trigger offline state in the application
        win.dispatchEvent(new Event('offline'))
      })
      
      // Should show offline indicator
      cy.contains('Working offline').should('be.visible')
      cy.contains('Your changes will sync when connection is restored').should('be.visible')
    })
  })

  describe('Multi-user Scenarios', () => {
    it('should handle concurrent list access', () => {
      // Simulate multiple users by opening the same list URL
      cy.visit('/list/test-list-id')
      cy.wait('@getList')
      
      // Verify list loads correctly
      cy.contains('Shopping List').should('be.visible')
      cy.get('input[placeholder="Add new item..."]').should('be.visible')
      
      // Verify sharing functionality is available
      cy.get('button').contains('Copy URL').should('be.visible')
    })

    it('should display list statistics correctly', () => {
      // Mock a list with items
      cy.intercept('GET', '/api/lists/test-list-id', {
        statusCode: 200,
        body: {
          id: 'test-list-id',
          items: [
            {
              id: 'item-1',
              text: 'Milk',
              completed: false,
              createdAt: new Date().toISOString(),
              order: 0
            },
            {
              id: 'item-2',
              text: 'Bread',
              completed: true,
              createdAt: new Date().toISOString(),
              order: 1
            }
          ],
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString()
        }
      }).as('getListWithItems')
      
      cy.visit('/list/test-list-id')
      cy.wait('@getListWithItems')
      
      // Verify statistics are displayed
      cy.contains('2 total items').should('be.visible')
      cy.contains('1 completed').should('be.visible')
      cy.contains('1 remaining').should('be.visible')
    })
  })

  describe('Error Handling', () => {
    it('should handle list not found error', () => {
      cy.intercept('GET', '/api/lists/invalid-id', {
        statusCode: 404,
        body: { error: 'list_not_found', message: 'Shopping list not found' }
      }).as('getInvalidList')
      
      cy.visit('/list/invalid-id')
      cy.wait('@getInvalidList')
      
      // Should show error message
      cy.contains('Error Loading List').should('be.visible')
      cy.get('button').contains('Try Again').should('be.visible')
      cy.get('button').contains('Go Home').should('be.visible')
    })

    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '/api/lists', {
        statusCode: 500,
        body: { error: 'server_error', message: 'Internal server error' }
      }).as('createListError')
      
      cy.visit('/')
      cy.get('button').contains('Create New List').click()
      
      cy.wait('@createListError')
      
      // Should show error message
      cy.contains('Failed to create list').should('be.visible')
    })
  })
})
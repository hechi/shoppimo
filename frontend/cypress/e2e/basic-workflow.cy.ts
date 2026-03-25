describe('Basic Shopping List Workflow', () => {
  it('should complete the basic user journey', () => {
    // Mock the API responses
    cy.intercept('POST', 'http://localhost:8080/api/lists', {
      statusCode: 201,
      body: {
        id: 'test-list-123',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }).as('createList')

    cy.intercept('GET', 'http://localhost:8080/api/lists/test-list-123', {
      statusCode: 200,
      body: {
        id: 'test-list-123',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }).as('getList')

    // 1. Visit home page
    cy.visit('/')
    
    // 2. Verify home page content
    cy.contains('Shared Shopping List').should('be.visible')
    cy.contains('Create New List').should('be.visible')
    
    // 3. Create a new list
    cy.get('button').contains('Create New List').click()
    cy.wait('@createList')
    
    // 4. Verify redirection to list page
    cy.url().should('include', '/list/test-list-123')
    cy.wait('@getList')
    
    // 5. Verify list page elements
    cy.contains('Shopping List').should('be.visible')
    cy.contains('Share this list:').should('be.visible')
    cy.get('button').contains('Copy URL').should('be.visible')
    
    // 6. Verify empty state
    cy.contains('Your list is empty').should('be.visible')
    
    // 7. Verify add item form
    cy.get('input[placeholder="Add new item..."]').should('be.visible')
    cy.get('button').contains('Add Item').should('be.disabled')
    
    // 8. Test input validation
    cy.get('input[placeholder="Add new item..."]').type('Test Item')
    cy.get('button').contains('Add Item').should('be.enabled')
  })

  it('should handle sharing functionality', () => {
    // Mock clipboard API
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText').resolves()
    })

    cy.intercept('GET', 'http://localhost:8080/api/lists/share-test', {
      statusCode: 200,
      body: {
        id: 'share-test',
        items: [],
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
    }).as('getSharedList')

    // Visit a list directly (simulating shared URL)
    cy.visit('/list/share-test')
    cy.wait('@getSharedList')
    
    // Verify sharing elements
    cy.contains('Share this list:').should('be.visible')
    cy.contains('http://localhost:3000/list/share-test').should('be.visible')
    
    // Test copy functionality
    cy.get('button').contains('Copy URL').click()
    cy.get('button').contains('Copied!').should('be.visible')
  })

  it('should handle error states', () => {
    // Test list not found
    cy.intercept('GET', 'http://localhost:8080/api/lists/not-found', {
      statusCode: 404,
      body: { error: 'list_not_found', message: 'Shopping list not found' }
    }).as('getNotFound')

    cy.visit('/list/not-found')
    cy.wait('@getNotFound')
    
    cy.contains('Error Loading List').should('be.visible')
    cy.get('button').contains('Try Again').should('be.visible')
    cy.get('button').contains('Go Home').should('be.visible')
  })
})
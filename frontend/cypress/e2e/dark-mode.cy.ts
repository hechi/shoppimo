describe('Dark Mode', () => {
  beforeEach(() => {
    cy.clearLocalStorage()

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

    cy.intercept('GET', '**/ws/**').as('ws')
  })

  describe('Theme toggle cycling', () => {
    it('should apply dark class to <html> when dark theme is selected', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-dark"]').click({ force: true })

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.true
      })
    })

    it('should remove dark class from <html> when light theme is selected', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('shoppimo_theme', 'dark')
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-light"]').click({ force: true })

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.false
      })
    })

    it('should set localStorage to "system" when system theme is selected', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-system"]').click({ force: true })

      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('system')
      })
    })

    it('should cycle from light to dark to system', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-light"]').click({ force: true })
      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('light')
      })

      cy.get('[data-testid="theme-option-dark"]').click({ force: true })
      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('dark')
      })
      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.true
      })

      cy.get('[data-testid="theme-option-system"]').click({ force: true })
      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('system')
      })
    })
  })

  describe('localStorage persistence across reload', () => {
    it('should persist dark theme after page reload', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-dark"]').click({ force: true })

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.true
      })

      cy.reload()
      cy.wait('@getList')

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.true
      })

      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('dark')
      })
    })

    it('should persist light theme after page reload', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('shoppimo_theme', 'dark')
      })

      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-option-light"]').click({ force: true })
      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('light')
      })

      cy.reload()
      cy.wait('@getList')

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.false
      })
      cy.window().then((win) => {
        expect(win.localStorage.getItem('shoppimo_theme')).to.equal('light')
      })
    })

    it('should restore theme from localStorage on initial load', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.window().then((win) => {
        win.localStorage.setItem('shoppimo_theme', 'dark')
      })

      cy.reload()
      cy.wait('@getList')

      cy.document().then((doc) => {
        expect(doc.documentElement.classList.contains('dark')).to.be.true
      })
    })
  })

  describe('Theme toggle UI', () => {
    it('should show theme toggle on list page', () => {
      cy.visit('/list/test-list-id')
      cy.wait('@getList')

      cy.get('[data-testid="theme-toggle"]').should('be.visible')
      cy.get('[data-testid="theme-option-light"]').should('be.visible')
      cy.get('[data-testid="theme-option-dark"]').should('be.visible')
      cy.get('[data-testid="theme-option-system"]').should('be.visible')
    })

    it('should show theme toggle on home page', () => {
      cy.visit('/')

      cy.get('[data-testid="theme-toggle"]').should('be.visible')
    })
  })
})

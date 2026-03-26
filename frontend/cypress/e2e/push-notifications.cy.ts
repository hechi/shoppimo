describe('Push Notifications', () => {
  const mockVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

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

    cy.intercept('GET', 'http://localhost:8080/api/push/vapid-key', {
      statusCode: 200,
      body: { publicKey: mockVapidKey },
    }).as('getVapidKey')

    cy.intercept('POST', 'http://localhost:8080/api/push/subscribe', {
      statusCode: 201,
      body: { success: true },
    }).as('subscribe')

    cy.intercept('POST', 'http://localhost:8080/api/push/unsubscribe', {
      statusCode: 200,
      body: { success: true },
    }).as('unsubscribe')
  })

  describe('Bell visibility', () => {
    it('should show push subscribe button on list page', () => {
      cy.visit('/list/test-list-id', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'Notification', {
            value: { permission: 'default', requestPermission: cy.stub().resolves('granted') },
            writable: true,
          })
        },
      })
      cy.wait('@getList')

      cy.get('[data-testid="push-subscribe-button"]').should('be.visible')
    })

    it('should NOT show push subscribe button on homepage', () => {
      cy.visit('/')

      cy.get('[data-testid="push-subscribe-button"]').should('not.exist')
    })
  })

  describe('Initial unsubscribed state', () => {
    it('should render bell button in unsubscribed (blue) state initially', () => {
      cy.visit('/list/test-list-id', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'Notification', {
            value: { permission: 'default', requestPermission: cy.stub().resolves('granted') },
            writable: true,
          })
        },
      })
      cy.wait('@getList')

      cy.get('[data-testid="push-subscribe-button"]')
        .should('be.visible')
        .and('not.be.disabled')
        .and('have.class', 'bg-blue-600')
    })

    it('should be disabled when notifications are denied', () => {
      cy.visit('/list/test-list-id', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'Notification', {
            value: { permission: 'denied', requestPermission: cy.stub().resolves('denied') },
            writable: true,
          })
        },
      })
      cy.wait('@getList')

      cy.get('[data-testid="push-subscribe-button"]')
        .should('be.visible')
        .and('be.disabled')
    })
  })

  describe('Permission request flow', () => {
    it('should request permission when bell is clicked with default permission', () => {
      const requestPermission = cy.stub().resolves('granted')

      cy.visit('/list/test-list-id', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'Notification', {
            value: { permission: 'default', requestPermission },
            writable: true,
          })

          const mockSubscription = {
            endpoint: 'https://test.push/endpoint',
            getKey: cy.stub().returns(new Uint8Array([1, 2, 3]).buffer),
            toJSON: () => ({
              endpoint: 'https://test.push/endpoint',
              keys: { p256dh: 'testkey', auth: 'testauth' },
            }),
          }

          const mockPushManager = {
            subscribe: cy.stub().resolves(mockSubscription),
            getSubscription: cy.stub().resolves(null),
          }

          const mockRegistration = {
            pushManager: mockPushManager,
          }

          Object.defineProperty(win.navigator, 'serviceWorker', {
            value: {
              ready: Promise.resolve(mockRegistration),
              register: cy.stub().resolves(mockRegistration),
            },
            writable: true,
          })
        },
      })
      cy.wait('@getList')

      cy.get('[data-testid="push-subscribe-button"]').click()
      cy.wait('@getVapidKey')
      cy.wait('@subscribe')

      cy.get('[data-testid="push-subscribe-button"]').should('have.class', 'bg-green-100')
    })
  })

  describe('Loading state', () => {
    it('should show disabled state during subscription attempt', () => {
      let resolveSubscribe: (value: unknown) => void
      const slowSubscription = new Promise((resolve) => {
        resolveSubscribe = resolve
      })

      cy.visit('/list/test-list-id', {
        onBeforeLoad(win) {
          Object.defineProperty(win, 'Notification', {
            value: { permission: 'granted', requestPermission: cy.stub().resolves('granted') },
            writable: true,
          })

          const mockPushManager = {
            subscribe: cy.stub().returns(slowSubscription),
            getSubscription: cy.stub().resolves(null),
          }

          const mockRegistration = {
            pushManager: mockPushManager,
          }

          Object.defineProperty(win.navigator, 'serviceWorker', {
            value: {
              ready: Promise.resolve(mockRegistration),
              register: cy.stub().resolves(mockRegistration),
            },
            writable: true,
          })
        },
      })
      cy.wait('@getList')

      cy.get('[data-testid="push-subscribe-button"]').click()

      cy.get('[data-testid="push-subscribe-button"]').should('be.disabled')
    })
  })
})

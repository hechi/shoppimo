# E2E Tests for Shared Shopping List

This directory contains end-to-end tests using Cypress that verify the complete user workflows for the shared shopping list application.

## Test Coverage

### 1. List Creation and Sharing Workflow (`basic-workflow.cy.ts`)
- ✅ Create new list from home page
- ✅ Automatic redirection to list page with UUID-based URL
- ✅ Display shareable URL prominently
- ✅ Copy URL to clipboard functionality
- ✅ Handle shared list access via URL
- ✅ Error handling for invalid lists

### 2. Complete User Journeys (`shopping-list.cy.ts`)
- ✅ Item management (add, edit, delete, toggle)
- ✅ Real-time collaboration simulation
- ✅ Multi-user scenarios
- ✅ WebSocket connection status handling
- ✅ Offline mode behavior
- ✅ List statistics and empty states
- ✅ Input validation and error states

## Key Features Tested

### List Creation and Sharing (Requirements 1.1, 1.2, 1.3, 6.2)
- Home page create new list functionality
- UUID-based URL generation
- Automatic redirection to list pages
- Prominent URL display for sharing
- Clipboard integration for URL copying

### Item Management (Requirements 2.1, 3.1, 4.1, 5.1)
- Add new items to lists
- Edit existing items
- Delete items with confirmation
- Toggle item completion status
- Input validation

### Real-time Collaboration (Requirements 7.1, 7.2)
- WebSocket connection status indicators
- Offline mode handling
- Sync state management
- Multi-user access simulation

### Error Handling (Requirements 8.1)
- Network error handling
- Invalid list ID handling
- Server error responses
- Graceful degradation

## Running Tests

### Interactive Mode (with GUI)
\`\`\`bash
npm run cypress:open
\`\`\`

### Headless Mode (CI/CD)
\`\`\`bash
npm run cypress:run
\`\`\`

### Run Specific Test
\`\`\`bash
npm run cypress:run -- --spec "cypress/e2e/basic-workflow.cy.ts"
\`\`\`

## Test Strategy

The tests use API mocking to avoid dependencies on the backend server, ensuring:
- Fast test execution
- Reliable test results
- Isolated frontend testing
- Predictable test data

## Custom Commands

Custom Cypress commands are defined in `support/commands.ts`:
- `cy.createList()` - Creates a new list and returns list ID
- `cy.addItem(text)` - Adds an item to the current list
- `cy.toggleItem(text)` - Toggles item completion status
- `cy.deleteItem(text)` - Deletes an item from the list

## Configuration

Cypress configuration is in `cypress.config.ts`:
- Base URL: http://localhost:3000
- Viewport: 1280x720
- Video recording: disabled (for faster execution)
- Screenshots: disabled on failure (for cleaner CI)
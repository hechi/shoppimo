# Automatic List Cleanup Feature

This document describes the automatic cleanup feature that removes inactive shopping lists after a configurable retention period.

## Overview

The system automatically deletes shopping lists that haven't been modified for a specified period (default: 30 days). This helps keep the database clean and prevents accumulation of abandoned lists.

## Backend Implementation

### CleanupService

The `CleanupService` class handles the automatic cleanup logic:

- **Location**: `backend/src/main/kotlin/com/shoppinglist/service/CleanupService.kt`
- **Runs every**: 24 hours
- **Default retention**: 30 days
- **Configurable via**: `LIST_RETENTION_DAYS` environment variable

#### Key Methods:

- `startCleanupScheduler()`: Starts the background cleanup job
- `performCleanup()`: Performs the actual cleanup and returns count of deleted lists
- `getListExpirationDate(listId)`: Returns when a specific list will expire
- `getRetentionDays()`: Returns the configured retention period

### Database Changes

- **ShoppingList model**: Added optional `expiresAt` field
- **ListRepository**: Added `getListWithExpiration()` method
- **API Response**: List endpoints now include expiration information

### Configuration

#### Environment Variables

```bash
# Set retention period (in days)
LIST_RETENTION_DAYS=30
```

#### Docker Compose

The environment variable is configured in:
- `docker-compose.yml` (development)
- `docker-compose.prod.yml` (production)
- `.env.prod` (production environment)

## Frontend Implementation

### ExpirationIndicator Component

Displays a visual indicator when a list is approaching expiration:

- **Location**: `frontend/src/components/ExpirationIndicator.tsx`
- **Shows when**: List expires within 7 days
- **Color coding**:
  - 🔴 Red: Expires today or already expired
  - 🟠 Orange: Expires within 1-3 days
  - 🟡 Yellow: Expires within 4-7 days

### Translation Support

New translation keys added for expiration messages:

```json
{
  "messages": {
    "listExpiredToday": "This list expires today",
    "listExpiresTomorrow": "This list expires tomorrow",
    "listExpiresInDays": "This list expires in {days} days"
  }
}
```

### Enhanced I18n Context

Updated translation function to support parameter interpolation:

```typescript
t('messages.listExpiresInDays', { days: 5 })
// Returns: "This list expires in 5 days"
```

## Testing

### Backend Tests

- **Location**: `backend/src/test/kotlin/com/shoppinglist/service/CleanupServiceTest.kt`
- **Coverage**: All cleanup scenarios including edge cases
- **Database**: Uses PostgreSQL with Testcontainers

### Frontend Tests

- **Location**: `frontend/src/components/__tests__/ExpirationIndicator.test.tsx`
- **Coverage**: All display states and styling variations

## Usage Examples

### Setting Custom Retention Period

```bash
# Set retention to 7 days
export LIST_RETENTION_DAYS=7

# Or in docker-compose.yml
environment:
  LIST_RETENTION_DAYS: 7
```

### Manual Cleanup Trigger

```kotlin
// In application code
val cleanupService = CleanupService()
val deletedCount = cleanupService.performCleanup()
println("Deleted $deletedCount expired lists")
```

### Checking List Expiration

```kotlin
// Get expiration date for a specific list
val expirationDate = cleanupService.getListExpirationDate(listId)
if (expirationDate != null) {
    println("List expires at: $expirationDate")
}
```

## Monitoring

### Logs

The cleanup service logs its activities:

```
INFO  - Starting cleanup scheduler with retention period of 30 days
INFO  - Performing cleanup for lists older than 2024-09-26T10:30:00Z
INFO  - Found 5 expired lists to clean up
INFO  - Cleaned up 5 expired lists
```

### Health Checks

The cleanup service status can be monitored through application health endpoints.

## Migration Notes

### Existing Lists

Existing lists will have their expiration calculated based on their `lastModified` timestamp plus the retention period.

### Backward Compatibility

The `expiresAt` field is optional, so existing API clients will continue to work without modification.

## Security Considerations

- Lists are permanently deleted (no soft delete)
- All associated items are also deleted (CASCADE)
- No user notification is sent before deletion
- Consider implementing user notifications for production use

## Performance Impact

- Cleanup runs once per day during low-traffic hours
- Database queries are optimized with proper indexing
- Minimal impact on application performance
- Cleanup duration scales with number of expired lists

## Future Enhancements

1. **User Notifications**: Email users before list expiration
2. **Configurable Schedule**: Allow custom cleanup intervals
3. **Soft Delete**: Implement recovery period before permanent deletion
4. **Analytics**: Track cleanup statistics and trends
5. **Admin Interface**: Manual cleanup controls for administrators
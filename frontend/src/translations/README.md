# Internationalization (i18n)

This app supports multiple languages with an easy-to-modify translation system.

## Supported Languages

- **English (en)** - Default language
- **German (de)** - Deutsch

## How to Use

The language is automatically detected from the browser settings, but users can manually switch languages using the language switcher in the top-right corner of the app.

## Adding/Modifying Translations

### Modifying Existing Translations

To modify existing phrases, edit the appropriate JSON file:

- `en.json` - English translations
- `de.json` - German translations

Example: To change the app title, modify the `app.title` key in both files:

```json
{
  "app": {
    "title": "Your New App Title"
  }
}
```

### Adding New Languages

1. Create a new JSON file (e.g., `fr.json` for French)
2. Copy the structure from `en.json` and translate all values
3. Update `frontend/src/context/I18nContext.tsx`:
   - Add the new language to the `Language` type
   - Add the import for the new translation file
   - Add it to the `translations` object
   - Add it to the `availableLanguages` array
   - Update the `detectBrowserLanguage` function if needed

### Translation File Structure

The translation files use nested objects with dot notation for keys:

```json
{
  "app": {
    "title": "Shared Shopping List",
    "description": "Create a new shopping list..."
  },
  "buttons": {
    "createNewList": "Create New List",
    "save": "Save"
  }
}
```

Access in components using: `t('app.title')` or `t('buttons.save')`

## Technical Details

- Uses React Context for state management
- Stores language preference in localStorage
- Falls back to English if a translation key is missing
- Automatically detects browser language on first visit
- No external dependencies required

## Usage in Components

```tsx
import { useI18n } from '../context/I18nContext';

const MyComponent = () => {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>Current language: {language}</p>
    </div>
  );
};
```
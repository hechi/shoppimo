import { useState } from 'react';
import { useList } from '../context/ListContext';
import { useI18n } from '../context/I18nContext';

const AddItemForm = () => {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItem } = useList();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setIsSubmitting(true);
    setError(null);
    
    try {
      await addItem(trimmedText);
      setText('');
    } catch (error: any) {
      setError(error.message || 'Failed to add item');
      console.error('Failed to add item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder={t('placeholders.addNewItem')}
            className={`w-full px-4 py-3 md:px-3 md:py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border rounded-md focus:outline-none focus:ring-2 transition-colors text-base md:text-sm ${
              error 
                ? 'border-red-300 dark:border-red-700 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-transparent'
            }`}
            disabled={isSubmitting}
            maxLength={500}
            data-testid="add-item-input"
          />
        </div>
        <button
          type="submit"
          disabled={!text.trim() || isSubmitting}
          className="px-5 py-3 md:px-4 md:py-2 bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 text-white font-medium rounded-md transition-colors flex items-center gap-2 text-base md:text-sm"
          data-testid="add-item-button"
        >
          {isSubmitting && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          )}
{isSubmitting ? t('buttons.creating') : t('buttons.addItem')}
        </button>
      </form>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}
      
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
        {text.length}/500 characters
      </div>
    </div>
  );
};

export default AddItemForm;
import { useState, useEffect } from 'react';
import { ListItem as ListItemType } from '../types';
import { useI18n } from '../context/I18nContext';

interface ListItemProps {
  item: ListItemType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const ListItem = ({ item, onUpdate, onDelete, onToggle }: ListItemProps) => {
  console.log('ListItem render:', { itemId: item.id, itemText: item.text, itemCompleted: item.completed });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { t } = useI18n();

  // Check if this is a temporary item (still being created)
  const isTemporary = item.id.startsWith('temp-');

  // Sync editText with item.text when item updates (e.g., from WebSocket)
  useEffect(() => {
    if (!isEditing) {
      setEditText(item.text || '');
    }
  }, [item.text, isEditing]);

  const handleEdit = () => {
    if (item.completed || isTemporary) return; // Don't allow editing completed or temporary items
    setIsEditing(true);
    setEditText(item.text || '');
  };

  const handleSave = async () => {
    const trimmedText = editText.trim();
    
    // Validation: text cannot be empty
    if (!trimmedText) {
      setEditText(item.text || '');
      setIsEditing(false);
      return;
    }

    // Only update if text actually changed
    if (trimmedText !== (item.text || '')) {
      setIsUpdating(true);
      try {
        await onUpdate(item.id, trimmedText);
      } catch (error) {
        // Revert on error
        setEditText(item.text || '');
      } finally {
        setIsUpdating(false);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.text || '');
    setIsEditing(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleToggle = async () => {
    try {
      await onToggle(item.id);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteClick = () => {
    if (isTemporary) return; // Don't allow deleting temporary items
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await onDelete(item.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to delete item:', error);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div 
      className={`flex items-center gap-3 p-4 md:p-3 rounded-lg group transition-all duration-200 ${
        isTemporary
          ? 'bg-blue-50 border border-blue-200 opacity-75'
          : item.completed 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-gray-50 hover:bg-gray-100 active:bg-gray-100'
      }`}
      data-testid={`item-${item.id}`}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.completed || false}
        onChange={handleToggle}
        disabled={isTemporary}
        className={`w-6 h-6 md:w-5 md:h-5 text-blue-600 rounded focus:ring-blue-500 ${
          isTemporary ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        title={
          isTemporary 
            ? t('messages.itemBeingCreated') 
            : (item.completed ? t('messages.markAsIncomplete') : t('messages.markAsComplete'))
        }
      />

      {/* Item text */}
      <div className="flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyPress}
              className="flex-1 px-3 py-2 md:px-2 md:py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
              autoFocus
              disabled={isUpdating}
            />
            {isUpdating && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        ) : (
          <span
            onClick={handleEdit}
            className={`block py-1 transition-colors ${
              isTemporary
                ? 'text-gray-500 cursor-not-allowed'
                : item.completed
                  ? 'line-through text-gray-500 cursor-pointer'
                  : 'text-gray-900 hover:text-blue-600 cursor-pointer hover:bg-blue-50 px-2 rounded'
            }`}
            title={
              isTemporary 
                ? t('messages.itemBeingCreated') 
                : (item.completed ? t('messages.itemCompleted') : t('messages.clickToEdit'))
            }
          >
            {item.text || ''}
          </span>
        )}
      </div>

      {/* Delete button with confirmation */}
      <div className="flex items-center gap-1">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDeleteConfirm}
              className="px-3 py-2 md:px-2 md:py-1 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm md:text-xs rounded transition-colors min-w-[60px] md:min-w-0"
              title={t('messages.confirmDelete')}
            >
{t('buttons.delete')}
            </button>
            <button
              onClick={handleDeleteCancel}
              className="px-3 py-2 md:px-2 md:py-1 bg-gray-300 hover:bg-gray-400 active:bg-gray-500 text-gray-700 text-sm md:text-xs rounded transition-colors min-w-[60px] md:min-w-0"
              title={t('messages.cancelDelete')}
            >
{t('buttons.cancel')}
            </button>
          </div>
        ) : (
          <button
            onClick={handleDeleteClick}
            disabled={isTemporary}
            className={`p-2 md:p-1 text-red-600 hover:text-red-800 active:text-red-900 hover:bg-red-50 active:bg-red-100 rounded transition-all ${
              isTemporary 
                ? 'opacity-25 cursor-not-allowed' 
                : 'opacity-80 hover:opacity-100 active:opacity-100 md:opacity-0 md:group-hover:opacity-100'
            }`}
            title={isTemporary ? t('messages.itemBeingCreated') : t('messages.deleteItem')}
          >
            <svg className="w-5 h-5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ListItem;
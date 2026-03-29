import { useState, useEffect, useRef, useCallback } from 'react';
import { ListItem as ListItemType } from '../types';
import { useI18n } from '../context/I18nContext';

interface ListItemProps {
  item: ListItemType;
  onUpdate: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 160;

const ListItem = ({ item, onUpdate, onDelete, onToggle }: ListItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const { t } = useI18n();

  const isTemporary = item.id.startsWith('temp-');
  const startX = useRef(0);
  const startY = useRef(0);
  const isSwiping = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditText(item.text || '');
    }
  }, [item.text, isEditing]);

  // Swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEditing || isTemporary) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isSwiping.current = false;
  }, [isEditing, isTemporary]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isEditing || isTemporary) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!isSwiping.current && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
      isSwiping.current = true;
    }
    if (isSwiping.current) {
      // Only allow swiping left (negative)
      setSwipeX(Math.min(0, dx));
    }
  }, [isEditing, isTemporary]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    if (swipeX < -DELETE_THRESHOLD) {
      // Full swipe — delete
      setIsDeleting(true);
      setSwipeX(-9999);
      setTimeout(() => onDelete(item.id), 200);
    } else if (swipeX < -SWIPE_THRESHOLD) {
      // Partial swipe — reveal delete button
      setSwipeX(-SWIPE_THRESHOLD);
    } else {
      setSwipeX(0);
    }
    isSwiping.current = false;
  }, [swipeX, item.id, onDelete]);

  // Reset swipe when tapping elsewhere
  useEffect(() => {
    if (swipeX !== 0) {
      const handler = (e: TouchEvent | MouseEvent) => {
        if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
          setSwipeX(0);
        }
      };
      document.addEventListener('touchstart', handler);
      document.addEventListener('mousedown', handler);
      return () => {
        document.removeEventListener('touchstart', handler);
        document.removeEventListener('mousedown', handler);
      };
    }
  }, [swipeX]);

  const handleEdit = () => {
    if (item.completed || isTemporary) return;
    setIsEditing(true);
    setEditText(item.text || '');
  };

  const handleSave = async () => {
    const trimmedText = editText.trim();
    if (!trimmedText) {
      setEditText(item.text || '');
      setIsEditing(false);
      return;
    }
    if (trimmedText !== (item.text || '')) {
      setIsUpdating(true);
      try {
        await onUpdate(item.id, trimmedText);
      } catch {
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
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') handleCancel();
  };

  const handleToggle = async () => {
    try {
      await onToggle(item.id);
    } catch (error) {
      console.error('Failed to toggle item:', error);
    }
  };

  const handleDeleteClick = () => {
    if (isTemporary) return;
    setIsDeleting(true);
    setSwipeX(-9999);
    setTimeout(() => onDelete(item.id), 200);
  };

  // Desktop fallback delete with confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      ref={rowRef}
      className={`relative overflow-hidden rounded-lg transition-all duration-200 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-40'}`}
      data-testid={`item-${item.id}`}
    >
      {/* Delete background revealed on swipe */}
      <div
        className="absolute inset-y-0 right-0 flex items-center bg-red-500 dark:bg-red-600 px-6 text-white font-medium text-sm cursor-pointer active:bg-red-700"
        onClick={() => { if (swipeX <= -SWIPE_THRESHOLD) handleDeleteClick(); }}
        aria-label={t('messages.deleteItem')}
      >
        <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {t('buttons.delete')}
      </div>

      {/* Swipeable foreground */}
      <div
        className={`relative flex items-center gap-3 p-4 md:p-3 group transition-colors ${
          isTemporary
            ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 opacity-75'
            : item.completed
              ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800'
              : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800'
        }`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping.current ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={item.completed || false}
          onChange={handleToggle}
          disabled={isTemporary}
          className={`w-6 h-6 md:w-5 md:h-5 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 ${
            isTemporary ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
          title={
            isTemporary
              ? t('messages.itemBeingCreated')
              : (item.completed ? t('messages.markAsIncomplete') : t('messages.markAsComplete'))
          }
        />

        {/* Item text */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 min-w-0">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyPress}
                className="flex-1 min-w-0 px-3 py-2 md:px-2 md:py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                autoFocus
                disabled={isUpdating}
              />
              {isUpdating && (
                <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              )}
            </div>
          ) : (
            <span
              onClick={handleEdit}
              className={`block py-1 truncate transition-colors ${
                isTemporary
                  ? 'text-gray-500 dark:text-gray-500 cursor-not-allowed'
                  : item.completed
                    ? 'line-through text-gray-500 dark:text-gray-500 cursor-pointer'
                    : 'text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950 px-2 rounded'
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

        {/* Desktop delete button (hidden on touch via md:opacity) */}
        <div className="hidden md:flex items-center gap-1">
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setShowDeleteConfirm(false); onDelete(item.id); }}
                className="px-2 py-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 text-white text-xs rounded transition-colors"
                title={t('messages.confirmDelete')}
              >
                {t('buttons.delete')}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-xs rounded transition-colors"
                title={t('messages.cancelDelete')}
              >
                {t('buttons.cancel')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => !isTemporary && setShowDeleteConfirm(true)}
              disabled={isTemporary}
              className={`p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all ${
                isTemporary ? 'opacity-25 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'
              }`}
              title={isTemporary ? t('messages.itemBeingCreated') : t('messages.deleteItem')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ListItem;

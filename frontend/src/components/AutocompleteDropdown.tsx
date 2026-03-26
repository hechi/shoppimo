import React, { useState } from 'react';

interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
  onDismiss: () => void;
  visible: boolean;
  highlightPrefix: string;
}

const AutocompleteDropdown: React.FC<Props> = ({
  suggestions,
  onSelect,
  onDismiss,
  visible,
  highlightPrefix,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  if (!visible) return null;
  if (suggestions.length === 0) return null;

  const displaySuggestions = suggestions.slice(0, 8);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => {
        const next = prev + 1;
        return next >= displaySuggestions.length ? -1 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => {
        return prev > -1 ? prev - 1 : prev;
      });
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < displaySuggestions.length) {
        e.preventDefault();
        onSelect(displaySuggestions[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onDismiss();
    }
  };

  const renderHighlightedText = (text: string, prefix: string) => {
    if (!prefix) return <>{text}</>;
    
    const lowerText = text.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();
    const index = lowerText.indexOf(lowerPrefix);
    
    if (index === -1) return <>{text}</>;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + prefix.length);
    const after = text.substring(index + prefix.length);
    
    return (
      <>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {before}
          <strong>{match}</strong>
          {after}
        </span>
      </>
    );
  };

  return (
    <ul
      data-testid="autocomplete-dropdown"
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 outline-none"
    >
      {displaySuggestions.map((suggestion, index) => (
        <li
          key={suggestion}
          data-testid="autocomplete-suggestion"
          role="option"
          aria-selected={activeIndex === index ? 'true' : 'false'}
          onClick={() => onSelect(suggestion)}
          className={`px-4 py-2 cursor-pointer ${
            activeIndex === index
              ? 'bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {renderHighlightedText(suggestion, highlightPrefix)}
        </li>
      ))}
    </ul>
  );
};

export default AutocompleteDropdown;

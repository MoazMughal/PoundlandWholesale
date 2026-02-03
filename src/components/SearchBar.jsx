import { useState, useEffect, useRef } from 'react';

const SearchBar = ({ 
  placeholder = "Search by name, SKU, category...", 
  onSearch, 
  suggestions = [],
  showSuggestions = false,
  className = "" 
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Handle search submission
  const handleSearch = (searchQuery = query) => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery.trim());
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (showSuggestions && value.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSearch(suggestions[selectedIndex]);
          setQuery(suggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        searchRef.current?.blur();
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    handleSearch(suggestion);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter suggestions based on query
  const filteredSuggestions = showSuggestions 
    ? suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : [];

  return (
    <div className={`search-container ${className}`} ref={searchRef}>
      <div className="relative">
        {/* Search Icon */}
        <div className="search-icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>

        {/* Search Input */}
        <input
          type="text"
          className="search-input"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (showSuggestions && query.trim() && filteredSuggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          aria-label="Search"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />

        {/* Search Button */}
        <button
          type="button"
          className="search-button"
          onClick={() => handleSearch()}
          aria-label="Search"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>

        {/* Clear Button */}
        {query && (
          <button
            type="button"
            className="absolute right-16 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              searchRef.current?.querySelector('input')?.focus();
            }}
            aria-label="Clear search"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && filteredSuggestions.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-2 py-2 z-50 max-h-64 overflow-y-auto"
          ref={suggestionsRef}
          role="listbox"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-primary-50 text-primary-700' : 'text-gray-700'
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              role="option"
              aria-selected={index === selectedIndex}
            >
              <div className="flex items-center gap-3">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
                <span>{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
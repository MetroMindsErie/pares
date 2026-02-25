import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faMapMarkerAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

const AutocompleteSearch = ({ onSearch, onSuggestionSelect, loading = false }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [searchHistory, setSearchHistory] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load search history from localStorage
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('propertySearchHistory') || '[]');
    setSearchHistory(history);
  }, []);

  // Generate suggestions based on query
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions(searchHistory.slice(0, 5));
      return;
    }

    const timer = setTimeout(() => {
      generateSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchHistory]);

  const generateSuggestions = (searchQuery) => {
    const suggestions = [];
    const lowerQuery = searchQuery.toLowerCase();

    // Pennsylvania counties - more comprehensive list
    const counties = [
      'Erie', 'Warren', 'Crawford', 'Allegheny', 'Philadelphia', 
      'Bucks', 'Chester', 'Delaware', 'Montgomery', 'Lancaster',
      'York', 'Dauphin', 'Lebanon', 'Berks', 'Schuylkill',
      'Luzerne', 'Lackawanna', 'Northampton', 'Lehigh', 'Carbon'
    ];
    
    counties.forEach(county => {
      if (county.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'county',
          text: `${county} County, PA`,
          value: county,
          icon: faMapMarkerAlt
        });
      }
    });

    // Major cities with better matching
    const cities = [
      'Pittsburgh', 'Philadelphia', 'Allentown', 'Erie', 'Reading',
      'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'York',
      'Altoona', 'Wilkes-Barre', 'Chester', 'Easton', 'McKeesport',
      'Norristown', 'Upper Darby', 'Levittown', 'New Castle', 'Johnstown'
    ];
    
    cities.forEach(city => {
      if (city.toLowerCase().includes(lowerQuery)) {
        suggestions.push({
          type: 'city',
          text: `${city}, PA`,
          value: city,
          icon: faMapMarkerAlt
        });
      }
    });

    // ZIP code suggestion with better validation
    if (/^\d{1,5}$/.test(searchQuery) && searchQuery.length >= 3) {
      suggestions.push({
        type: 'zipcode',
        text: `ZIP Code: ${searchQuery}`,
        value: searchQuery,
        icon: faMapMarkerAlt
      });
    }

    // Search history that matches
    searchHistory.forEach(item => {
      if (item.toLowerCase().includes(lowerQuery) && 
          !suggestions.some(s => s.text === item)) {
        suggestions.push({
          type: 'history',
          text: item,
          value: item,
          icon: faSearch
        });
      }
    });

    setSuggestions(suggestions.slice(0, 8));
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev > -1 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeSuggestion >= 0) {
          selectSuggestion(suggestions[activeSuggestion]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    
    // Add to search history
    saveToHistory(suggestion.text);
    
    // Trigger search
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else {
      handleSearch(suggestion.value);
    }
  };

  const handleSearch = (searchValue = query) => {
    if (!searchValue.trim()) return;
    
    saveToHistory(searchValue);
    setShowSuggestions(false);
    
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  const saveToHistory = (searchTerm) => {
    const newHistory = [
      searchTerm,
      ...searchHistory.filter(item => item !== searchTerm)
    ].slice(0, 10);
    
    setSearchHistory(newHistory);
    localStorage.setItem('propertySearchHistory', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('propertySearchHistory');
    setSuggestions([]);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search by city, county, or ZIP code..."
          className="w-full pl-12 pr-16 py-4 text-lg border-2 border-gray-200 rounded-2xl focus:border-teal-500 focus:outline-none transition-colors bg-white shadow-lg"
        />
        
        <FontAwesomeIcon 
          icon={faSearch} 
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
        />
        
        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          {loading ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSearch} />
          )}
          Search
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto"
        >
          {searchHistory.length > 0 && query.length < 2 && (
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
              <span className="text-sm font-medium text-gray-600">Recent Searches</span>
              <button
                onClick={clearHistory}
                className="text-xs text-teal-600 hover:text-teal-800"
              >
                Clear
              </button>
            </div>
          )}
          
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => selectSuggestion(suggestion)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                index === activeSuggestion ? 'bg-teal-50 border-r-2 border-teal-500' : ''
              }`}
            >
              <FontAwesomeIcon 
                icon={suggestion.icon} 
                className={`text-sm ${
                  suggestion.type === 'history' ? 'text-gray-400' : 'text-teal-500'
                }`} 
              />
              <span className="text-gray-900">{suggestion.text}</span>
              {suggestion.type === 'county' && (
                <span className="ml-auto text-xs text-gray-500">County</span>
              )}
              {suggestion.type === 'city' && (
                <span className="ml-auto text-xs text-gray-500">City</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSearch;

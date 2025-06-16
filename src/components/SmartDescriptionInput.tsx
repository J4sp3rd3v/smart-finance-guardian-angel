import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useDescriptionSuggestions } from '@/hooks/useDescriptionSuggestions';

interface SmartDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  categoryId: string;
  placeholder?: string;
  required?: boolean;
}

const SmartDescriptionInput = ({ 
  value, 
  onChange, 
  categoryId, 
  placeholder = "Es: Benzina moto, Spesa supermercato",
  required = false
}: SmartDescriptionInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const { suggestions, getSuggestions, clearSuggestions } = useDescriptionSuggestions();

  useEffect(() => {
    if (value.length >= 2 && categoryId) {
      getSuggestions(categoryId, value);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      clearSuggestions();
    }
    setSelectedIndex(-1);
  }, [value, categoryId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    clearSuggestions();
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        clearSuggestions();
        setSelectedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Delay hiding suggestions to allow click events
          setTimeout(() => {
            setShowSuggestions(false);
            clearSuggestions();
          }, 200);
        }}
        onFocus={() => {
          if (value.length >= 2 && categoryId && suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
        required={required}
        className="w-full"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto shadow-lg border border-gray-200">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 px-2">
              💡 Suggerimenti basati sulle tue transazioni precedenti:
            </div>
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                ref={el => suggestionRefs.current[index] = el}
                className={`px-3 py-2 rounded cursor-pointer text-sm transition-colors ${
                  index === selectedIndex 
                    ? 'bg-blue-100 text-blue-900' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium">{suggestion}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SmartDescriptionInput; 
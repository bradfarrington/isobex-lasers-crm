import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import './SearchableSelect.css';

interface Option {
  label: string;
  value: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  sort?: boolean;
  style?: React.CSSProperties;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  searchable = true,
  sort = true,
  style,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    let sortedOptions = [...options];
    if (sort) {
       sortedOptions.sort((a, b) => a.label.localeCompare(b.label));
    }
    if (!searchTerm || !searchable) {
      // Use full list if fewer than 100 elements; otherwise limit to keep perf good
      return sortedOptions.slice(0, 100);
    }
    const lowerSearch = searchTerm.toLowerCase();
    return sortedOptions.filter((o) => o.label.toLowerCase().includes(lowerSearch)).slice(0, 100);
  }, [options, searchTerm, sort, searchable]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    } else {
      setSearchTerm(''); // Clear search when closed
    }
  }, [isOpen, searchable]);

  return (
    <div className={`searchable-select-container ${isOpen ? 'open' : ''} ${className}`} style={style} ref={containerRef}>
      <button
        type="button"
        className={`searchable-select-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''} ${!selectedOption && !value ? 'empty' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="searchable-select-value">
          {selectedOption ? selectedOption.label : (value ? 'Unknown Option' : placeholder)}
        </div>
        <div className="searchable-select-actions">
          {value && !disabled && (
            <div
              className="searchable-select-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setIsOpen(false);
              }}
              title="Clear selection"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={14} className="searchable-select-icon" />
        </div>
      </button>

      {isOpen && (
        <div className="searchable-select-popover">
          {searchable && (
            <div className="searchable-select-search">
              <Search size={14} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <ul className="searchable-select-list">
            {options.length === 0 ? (
              <li className="searchable-select-empty">No options available</li>
            ) : filteredOptions.length === 0 ? (
              <li className="searchable-select-empty">No matches found</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`searchable-select-item ${option.value === value ? 'selected' : ''}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                  {option.value === value && <Check size={14} className="searchable-select-check" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

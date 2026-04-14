import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import './MultiSelect.css';

interface Option {
  label: string;
  value: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  sort?: boolean;
  clearable?: boolean;
  style?: React.CSSProperties;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  searchable = true,
  sort = true,
  clearable = true,
  style,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = useMemo(() => options.filter((o) => value.includes(o.value)), [options, value]);

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
    <div className={`multi-select-container ${isOpen ? 'open' : ''} ${className}`} style={style} ref={containerRef}>
      <button
        type="button"
        className={`multi-select-trigger ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''} ${selectedOptions.length === 0 ? 'empty' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="multi-select-value">
          {selectedOptions.length > 0 ? selectedOptions.map(o => o.label).join(', ') : placeholder}
        </div>
        <div className="multi-select-actions">
          {clearable && value.length > 0 && !disabled && (
            <div
              className="multi-select-clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              title="Clear selection"
            >
              <X size={14} />
            </div>
          )}
          <ChevronDown size={14} className="multi-select-icon" />
        </div>
      </button>

      {isOpen && (
        <div className="multi-select-popover">
          {searchable && (
            <div className="multi-select-search">
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
          <ul className="multi-select-list">
            {options.length === 0 ? (
              <li className="multi-select-empty">No options available</li>
            ) : filteredOptions.length === 0 ? (
              <li className="multi-select-empty">No matches found</li>
            ) : (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`multi-select-item ${value.includes(option.value) ? 'selected' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (value.includes(option.value)) {
                      onChange(value.filter(v => v !== option.value));
                    } else {
                      onChange([...value, option.value]);
                    }
                  }}
                >
                  {option.label}
                  {value.includes(option.value) && <Check size={14} className="multi-select-check" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

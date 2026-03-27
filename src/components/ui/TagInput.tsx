import { useState, useRef, useEffect, useCallback } from 'react';
import type { Tag } from '@/types/database';
import { X, Plus } from 'lucide-react';
import './TagInput.css';

interface TagInputProps {
  /** Tags currently assigned to the entity */
  assignedTags: Tag[];
  /** All available tags in the system */
  allTags: Tag[];
  /** Called when a tag is added — returns tag id */
  onAdd: (tagId: string) => void;
  /** Called when a tag is removed — returns tag id */
  onRemove: (tagId: string) => void;
  /** Called when the user types a new tag name to create */
  onCreate: (name: string) => Promise<Tag>;
  /** Compact mode for inline use */
  compact?: boolean;
}

export function TagInput({
  assignedTags,
  allTags,
  onAdd,
  onRemove,
  onCreate,
  compact = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignedIds = new Set(assignedTags.map((t) => t.id));

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter suggestions: not already assigned, and matching input
  const suggestions = allTags.filter(
    (t) =>
      !assignedIds.has(t.id) &&
      (!input.trim() || t.name.toLowerCase().includes(input.toLowerCase()))
  );

  const trimmed = input.trim();
  const exactMatch = allTags.find(
    (t) => t.name.toLowerCase() === trimmed.toLowerCase()
  );
  const showCreate = trimmed.length > 0 && !exactMatch;

  const handleSelect = useCallback(
    (tag: Tag) => {
      onAdd(tag.id);
      setInput('');
      setOpen(false);
    },
    [onAdd]
  );

  const handleCreate = useCallback(async () => {
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const newTag = await onCreate(trimmed);
      onAdd(newTag.id);
      setInput('');
      setOpen(false);
    } finally {
      setCreating(false);
    }
  }, [trimmed, creating, onCreate, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreate) {
        handleCreate();
      } else if (suggestions.length === 1) {
        handleSelect(suggestions[0]);
      }
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`tag-input-wrap${compact ? ' compact' : ''}`} ref={wrapRef}>
      {/* Assigned tag pills */}
      <div className="tag-input-pills">
        {assignedTags.map((tag) => (
          <span key={tag.id} className="tag-pill">
            {tag.name}
            <button
              type="button"
              className="tag-pill-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag.id);
              }}
              title="Remove tag"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Input */}
        <div className="tag-input-field-wrap">
          <input
            ref={inputRef}
            type="text"
            className="tag-input-field"
            placeholder={assignedTags.length === 0 ? 'Add a tag…' : 'Add…'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>

      {/* Dropdown */}
      {open && (suggestions.length > 0 || showCreate) && (
        <div className="tag-input-dropdown">
          {suggestions.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className="tag-input-option"
              onClick={() => handleSelect(tag)}
            >
              <span className="tag-pill small">{tag.name}</span>
            </button>
          ))}

          {showCreate && (
            <button
              type="button"
              className="tag-input-option create"
              onClick={handleCreate}
              disabled={creating}
            >
              <Plus size={12} />
              Create &ldquo;{trimmed}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

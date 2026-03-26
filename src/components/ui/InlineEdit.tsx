import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import './InlineEdit.css';

interface InlineEditProps {
  value: string | null;
  onSave: (val: string) => Promise<void> | void;
  renderView: () => ReactNode;
  renderInput: (props: {
    value: string;
    onChange: (val: string) => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onSaveAndClose: (val: string) => Promise<void>;
    autoFocus: boolean;
  }) => ReactNode;
  className?: string;
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  renderView,
  renderInput,
  className = '',
  disabled = false,
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');

  useEffect(() => {
    if (isEditing) {
      setEditValue(value || '');
    }
  }, [value, isEditing]);

  const handleSave = async (val?: string) => {
    const finalVal = val !== undefined ? val : editValue;
    if (finalVal !== (value || '')) {
      await onSave(finalVal);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Prevent form submission or newline
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className={`inline-edit-container editing ${className}`}>
        {renderInput({
          value: editValue,
          onChange: setEditValue,
          onBlur: () => handleSave(),
          onKeyDown: handleKeyDown,
          onSaveAndClose: async (val: string) => {
            setEditValue(val);
            await handleSave(val);
          },
          autoFocus: true,
        })}
      </div>
    );
  }

  return (
    <div
      className={`inline-edit-container view ${disabled ? 'disabled' : ''} ${className}`}
      onClick={() => !disabled && setIsEditing(true)}
      title={disabled ? undefined : 'Click to edit'}
    >
      <div className="inline-edit-content">{renderView()}</div>
      {!disabled && (
        <div className="inline-edit-icon">
          <Pencil size={12} />
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SaveViewInputProps {
  isOpen: boolean;
  onSave: (name: string) => void;
  onReplace: (name: string) => void;
  onCancel: () => void;
  hasViewWithName: (name: string) => boolean;
}

export function SaveViewInput({
  isOpen,
  onSave,
  onReplace,
  onCancel,
  hasViewWithName,
}: SaveViewInputProps) {
  const [name, setName] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Delay to ensure DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // `showReplace` is reset wherever `name` changes — in the onChange handler
  // below and after successful save/replace/cancel. Replaces a prior
  // setState-in-effect pattern (`useEffect([name]) => setShowReplace(false)`)
  // that is equivalent but ran an extra render.
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setShowReplace(false);
  }, []);

  const trimmedName = name.trim();
  const isEmpty = trimmedName.length === 0;

  const handleSave = useCallback(() => {
    if (isEmpty) return;

    if (hasViewWithName(trimmedName)) {
      if (showReplace) {
        // Second click — confirm replace
        onReplace(trimmedName);
        setName('');
        setShowReplace(false);
      } else {
        // First click — show replace confirmation
        setShowReplace(true);
      }
      return;
    }

    onSave(trimmedName);
    setName('');
  }, [isEmpty, trimmedName, hasViewWithName, showReplace, onReplace, onSave]);

  const handleCancel = useCallback(() => {
    setName('');
    setShowReplace(false);
    onCancel();
  }, [onCancel]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Input
        ref={inputRef}
        value={name}
        onChange={handleNameChange}
        onKeyDown={handleKeyDown}
        placeholder="View name..."
        className="h-8 w-48 text-body"
      />
      <Button
        variant={showReplace ? 'destructive' : 'outline'}
        size="sm"
        disabled={isEmpty}
        onClick={handleSave}
        className="h-8 gap-1 text-caption px-2"
      >
        <Check className="h-3.5 w-3.5" />
        {showReplace ? 'Replace?' : 'Save'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="h-8 w-8 p-0"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

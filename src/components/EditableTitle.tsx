import React, { useState, useEffect, useRef } from 'react';
import { Edit2 } from 'lucide-react';

interface EditableTitleProps {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
}

export const EditableTitle: React.FC<EditableTitleProps> = ({ value, onChange, className = "" }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (inputValue !== value && inputValue.trim() !== "") {
      onChange(inputValue);
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`text-xl font-bold text-slate-800 bg-white border-b-2 border-blue-500 outline-none px-1 py-0.5 ${className}`}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={`group flex items-center gap-2 cursor-pointer px-1 py-0.5 rounded hover:bg-slate-100 transition-colors ${className}`}
    >
      <h1 className="text-xl font-bold text-slate-800 truncate max-w-[300px]">
        {value || "Untitled Plan"}
      </h1>
      <Edit2 className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

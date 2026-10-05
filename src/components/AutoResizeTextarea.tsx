import React, { useRef, useEffect } from 'react';
import { countChars, clipToMaxChars } from '../countChars';
import { UI_STRINGS } from '../content/ui.fa';

interface AutoResizeTextareaProps {
  value: string;
  onChange: (newValue: string) => void;
  onPasteEvent: (pastedLength: number) => void;
  maxChars: number;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  onChange,
  onPasteEvent,
  maxChars,
  placeholder = UI_STRINGS.question.placeholder,
  id = 'answer-input',
  ariaLabel,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(140, el.scrollHeight)}px`;
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    // Typing past the cap is blocked: keep the longest prefix that fits.
    onChange(countChars(next).count > maxChars ? clipToMaxChars(next, maxChars) : next);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    // Telemetry records only the length of the pasted text, never its content.
    onPasteEvent(pasted.length);

    e.preventDefault();
    const el = textareaRef.current;
    if (!el) return;
    const merged = value.substring(0, el.selectionStart) + pasted + value.substring(el.selectionEnd);
    onChange(clipToMaxChars(merged, maxChars));
  };

  return (
    <textarea
      ref={textareaRef}
      id={id}
      aria-label={ariaLabel}
      dir="rtl"
      rows={4}
      value={value}
      onChange={handleChange}
      onPaste={handlePaste}
      placeholder={placeholder}
      style={{ unicodeBidi: 'plaintext' }}
      className="w-full resize-none rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-base leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition duration-150"
    />
  );
};

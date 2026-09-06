'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  name?: string;
  className?: string;
  id?: string;
};

export function PasswordField({
  value,
  onChange,
  placeholder = 'رمز عبور',
  autoComplete = 'current-password',
  required,
  minLength,
  name,
  className = '',
  id,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        name={name}
        className="ario-field ltr-isolate pe-12"
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
      />
      <button
        type="button"
        className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-ario text-muted transition hover:text-ink"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'مخفی کردن رمز' : 'نمایش رمز'}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

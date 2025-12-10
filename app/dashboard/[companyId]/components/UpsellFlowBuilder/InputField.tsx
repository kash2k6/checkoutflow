import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  textarea?: boolean;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export default function InputField({
  label,
  textarea = false,
  textareaProps,
  className = '',
  ...inputProps
}: InputFieldProps) {
  const baseInputClasses = 'w-full px-3 md:px-4 py-2.5 md:py-3 border border-gray-a4 rounded-xl bg-white dark:bg-gray-a3 text-gray-12 placeholder:text-gray-9 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all duration-200 text-base md:text-sm min-h-[44px]';

  return (
    <div className="space-y-2">
      <label className="block text-xs md:text-sm font-semibold text-gray-12">
        {label}
      </label>
      {textarea ? (
        <textarea
          {...textareaProps}
          className={`${baseInputClasses} ${textareaProps?.className || ''}`}
        />
      ) : (
        <input
          {...inputProps}
          className={`${baseInputClasses} ${className}`}
        />
      )}
    </div>
  );
}


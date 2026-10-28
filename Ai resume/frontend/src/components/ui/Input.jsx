import React from 'react';

const Input = ({
  label,
  error,
  helperText,
  id,
  className = '',
  containerClassName = '',
  ...props
}) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border rounded-lg transition-colors text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-400 ${
          error
            ? 'border-rose-400 dark:border-rose-500 focus:border-rose-500 focus:ring-rose-500'
            : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500'
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
      {!error && helperText && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>}
    </div>
  );
};

export default Input;

import React, { InputHTMLAttributes } from 'react';
import './Input.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ 
  className = '', 
  label, 
  error, 
  id,
  ...props 
}, ref) => {
  const inputId = id || props.name;

  return (
    <div className={`ui-input-wrapper ${className}`}>
      {label && <label htmlFor={inputId} className="ui-input-label">{label}</label>}
      <input 
        id={inputId}
        ref={ref}
        className={`ui-input ${error ? 'ui-input--error' : ''}`}
        {...props}
      />
      {error && <span className="ui-input-error">{error}</span>}
    </div>
  );
});

Input.displayName = "Input";

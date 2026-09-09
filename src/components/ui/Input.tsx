import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="fld">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={className} {...props} />
    </div>
  );
};

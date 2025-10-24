import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    const base =
      'block w-full rounded-md border px-3 py-2 text-sm outline-none ' +
      'border-gray-300 focus:border-black';
    return <input ref={ref} className={`${base} ${className}`} {...props} />;
  }
);
Input.displayName = 'Input';

export default Input;

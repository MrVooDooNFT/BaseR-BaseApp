import * as React from 'react';
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    const base = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
    return <textarea ref={ref} className={`${base} ${className}`} {...props} />;
  }
);
Textarea.displayName = 'Textarea';
export default Textarea;

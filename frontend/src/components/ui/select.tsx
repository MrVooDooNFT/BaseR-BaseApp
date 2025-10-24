import * as React from 'react';

export function Select({
  children, className = '', ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const base = 'block w-full rounded-md border border-gray-300 px-3 py-2 text-sm';
  return <select className={`${base} ${className}`} {...props}>{children}</select>;
}
export const SelectTrigger = (p: React.HTMLAttributes<HTMLDivElement>) => <div {...p} />;
export const SelectContent = (p: React.HTMLAttributes<HTMLDivElement>) => <div {...p} />;
export const SelectItem = (p: React.HTMLAttributes<HTMLDivElement>) => <div {...p} />;
export const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>;
export default Select;

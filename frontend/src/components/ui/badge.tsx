import * as React from 'react';
export function Badge({ className = '', ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const base = 'inline-flex items-center rounded-full border px-2 py-0.5 text-xs';
  return <span className={`${base} ${className}`} {...props} />;
}
export default Badge;

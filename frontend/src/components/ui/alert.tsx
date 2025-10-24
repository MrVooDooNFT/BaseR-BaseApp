import * as React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success';
}

export function Alert({ className = '', variant = 'default', ...props }: AlertProps) {
  const variants: Record<string, string> = {
    default: 'border-gray-200 bg-white text-gray-900',
    destructive: 'border-red-400 bg-red-50 text-red-700',
    success: 'border-green-400 bg-green-50 text-green-700',
  };
  return (
    <div
      className={`rounded-md border p-3 text-sm ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export const AlertTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5 className={`mb-1 font-semibold ${className}`} {...props} />
);

export const AlertDescription = ({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm ${className}`} {...props} />
);

export default Alert;

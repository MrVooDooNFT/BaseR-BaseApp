import * as React from 'react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-lg w-full p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogTrigger({ asChild, children }: any) {
  return asChild ? children : <button>{children}</button>;
}

export function DialogContent({ children, className = '' }: any) {
  return <div className={`p-2 ${className}`}>{children}</div>;
}

export function DialogHeader({ children }: any) {
  return <div className="mb-2 border-b pb-2">{children}</div>;
}

export function DialogTitle({ children }: any) {
  return <h3 className="text-lg font-semibold mb-1">{children}</h3>;
}

export function DialogDescription({ children }: any) {
  return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
}

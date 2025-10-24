import * as React from 'react';

export interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Collapsible({ open, onOpenChange, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false);
  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className="border rounded-md">
      <button
        type="button"
        className="w-full text-left p-2 font-medium"
        onClick={toggle}
      >
        {isOpen ? '▼' : '▶'} Section
      </button>
      {isOpen && <div className="p-3 border-t">{children}</div>}
    </div>
  );
}

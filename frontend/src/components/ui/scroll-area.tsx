import * as React from 'react';

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  viewportClassName?: string;
}

export function ScrollArea({
  className = '',
  viewportClassName = '',
  style,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      className={`relative ${className}`}
      style={{ position: 'relative', ...style }}
      {...props}
    >
      <div className={`max-h-full overflow-auto ${viewportClassName}`}>{children}</div>
    </div>
  );
}

// Opsiyonel: API uyumu için boş ScrollBar
export function ScrollBar() {
  return null;
}

export default ScrollArea;

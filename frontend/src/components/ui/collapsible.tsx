/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

export interface CollapsibleProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Collapsible({ open, onOpenChange, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false)
  const toggle = () => {
    const next = !isOpen
    setIsOpen(next)
    onOpenChange?.(next)
  }

  return (
    <div className="border rounded-md">
      {React.Children.map(children, (child: any) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { isOpen, toggle })
          : child
      )}
    </div>
  )
}

export function CollapsibleTrigger({
  children,
  toggle,
}: {
  children: React.ReactNode
  toggle?: () => void
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full text-left p-2 font-medium"
    >
      {children}
    </button>
  )
}

export function CollapsibleContent({
  children,
  isOpen,
}: {
  children: React.ReactNode
  isOpen?: boolean
}) {
  if (!isOpen) return null
  return <div className="p-3 border-t">{children}</div>
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

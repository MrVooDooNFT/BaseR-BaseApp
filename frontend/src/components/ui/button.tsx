import * as React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost'
}

export function Button({ className = '', variant = 'default', ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors'
  const variants: Record<string, string> = {
    default: 'bg-indigo-600 text-white hover:bg-indigo-700',
    outline: 'border border-gray-400 text-gray-800 hover:bg-gray-100',
    ghost: 'bg-transparent hover:bg-gray-100'
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

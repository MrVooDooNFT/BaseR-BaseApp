import * as React from 'react';
type Props = React.InputHTMLAttributes<HTMLInputElement>;
export function Switch({ className = '', ...props }: Props) {
  return <input type="checkbox" className={`h-5 w-9 rounded-full accent-black ${className}`} {...props} />;
}
export default Switch;

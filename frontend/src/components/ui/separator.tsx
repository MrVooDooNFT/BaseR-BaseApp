import * as React from 'react';
export function Separator({ className = '', ...props }: React.HTMLAttributes<HTMLHRElement>) {
  return <hr className={`my-2 border-gray-200 ${className}`} {...props} />;
}
export default Separator;

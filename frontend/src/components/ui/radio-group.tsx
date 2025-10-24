import * as React from 'react';

type RGContext = {
  name: string;
  value?: string;
  setValue?: (v: string) => void;
};

const RadioGroupContext = React.createContext<RGContext | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  name?: string;
}

export function RadioGroup({
  value,
  defaultValue,
  onValueChange,
  name,
  className = '',
  children,
  ...props
}: RadioGroupProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;

  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  const ctx: RGContext = {
    name: name || React.useId(),
    value: current,
    setValue,
  };

  return (
    <RadioGroupContext.Provider value={ctx}>
      <div className={`flex flex-col gap-2 ${className}`} role="radiogroup" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string;
  id?: string;
}

export function RadioGroupItem({ value, id, className = '', ...props }: RadioGroupItemProps) {
  const ctx = React.useContext(RadioGroupContext);
  if (!ctx) {
    // Güvenli fallback: bağımsız kullanımda normal radio gibi davranır
    return <input type="radio" value={value} id={id} className={className} {...props} />;
  }

  const checked = ctx.value === value;

  return (
    <input
      type="radio"
      id={id}
      name={ctx.name}
      value={value}
      checked={checked}
      onChange={() => ctx.setValue?.(value)}
      className={`h-4 w-4 accent-black ${className}`}
      {...props}
    />
  );
}

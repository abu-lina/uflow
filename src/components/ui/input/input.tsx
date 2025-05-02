import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div>
        <label className="block text-sm font-medium" htmlFor={props.id}>
          {label}
        </label>
        <input
          ref={ref}
          className={`mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

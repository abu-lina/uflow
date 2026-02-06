import { ReactNode, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type InputVariant = 'default' | 'with-icon';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input field variant
   * - 'default': label + input
   * - 'with-icon': label + input + right icon
   */
  variant?: InputVariant;
  /**
   * Label text for the input
   */
  label: string;
  /**
   * Optional right icon (for 'with-icon' variant)
   */
  rightIcon?: ReactNode;
  /**
   * Optional onClick handler for the right icon
   */
  onRightIconClick?: () => void;
  /**
   * Additional CSS classes for the container
   */
  containerClassName?: string;
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  /**
   * Additional CSS classes for the input
   */
  inputClassName?: string;
  /**
   * Additional CSS classes for the right icon container
   */
  iconClassName?: string;
}

/**
 * Reusable form input component with consistent styling and two variants.
 * 
 * Variants:
 * - 'default': Standard input with label and input field
 * - 'with-icon': Input with label, input field, and right icon
 * 
 * Features:
 * - Consistent 56px height with rounded-2xl border
 * - Proper label styling (#999999 text, 12px size)
 * - Input styling with focus states
 * - Right icon support for password visibility, etc.
 * 
 * @example
 * ```tsx
 * // Default variant
 * <FormInput
 *   label="E-Mail"
 *   placeholder="Email eingeben"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 * />
 * 
 * // With icon variant (password field)
 * <FormInput
 *   label="Passwort"
 *   placeholder="Passwort eingeben"
 *   type={showPassword ? 'text' : 'password'}
 *   variant="with-icon"
 *   rightIcon={showPassword ? <EyeOff /> : <Eye />}
 *   onRightIconClick={() => setShowPassword(!showPassword)}
 * />
 * ```
 */
export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({
    variant = 'default',
    label,
    rightIcon,
    onRightIconClick,
    containerClassName = '',
    labelClassName = '',
    inputClassName = '',
    iconClassName = '',
    className = '',
    ...props
  }, ref) => {
    const isWithIcon = variant === 'with-icon';

    return (
      <div className={cn(
        'flex h-[56px] w-full items-center rounded-2xl border border-border bg-background py-2',
        isWithIcon ? 'justify-between' : '',
        containerClassName
      )}>
        {/* Label + Input Container */}
        <div className="flex w-full flex-col gap-1 px-3">
          <label className={cn(
            'text-xs leading-[15px] text-content-muted',
            labelClassName
          )}>
            {label}
          </label>
          <input
            ref={ref}
            className={cn(
              'h-[18px] w-full border-none bg-transparent p-0 text-[15px] font-medium leading-[18px] tracking-[0.15px] text-content placeholder:text-content-muted focus:outline-none focus:ring-0',
              inputClassName,
              className
            )}
            {...props}
          />
        </div>
        
        {/* Right Icon (only for with-icon variant) */}
        {isWithIcon && rightIcon && (
          <div className={cn('px-3', iconClassName)}>
            {onRightIconClick ? (
              <button
                className="flex h-6 w-6 items-center justify-center text-content-heading hover:text-content"
                type="button"
                onClick={onRightIconClick}
              >
                {rightIcon}
              </button>
            ) : (
              <div className="flex h-6 w-6 items-center justify-center text-content-heading">
                {rightIcon}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

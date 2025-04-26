// Common UI Types
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'default' | 'primary' | 'secondary' | 'danger' | 'success';
export type ColorScheme = 'light' | 'dark';

// Layout Types
export type Spacing = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type MaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
export type Direction = 'horizontal' | 'vertical';

// Component States
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
export type ValidationState = 'valid' | 'invalid' | 'warning';

// Common Props
export interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

export interface ValidationProps {
  error?: string;
  warning?: string;
  success?: string;
}

// Animation Types
export type AnimationVariant = 'fade' | 'slide' | 'scale' | 'none'; 
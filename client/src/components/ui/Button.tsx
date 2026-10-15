import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 border border-emerald-300/40',
  secondary:
    'bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/10 active:scale-95 shadow-sm',
  outline:
    'bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.1] active:scale-95 shadow-sm',
  ghost:
    'bg-transparent hover:bg-white/[0.06] text-slate-300 hover:text-white',
  danger:
    'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold shadow-[0_0_20px_rgba(244,63,94,0.35)] active:scale-95 border border-rose-500/30',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-xl gap-1.5 h-8 font-semibold',
  md: 'text-sm px-4 py-2 rounded-xl gap-2 h-9.5 font-bold',
  lg: 'text-base px-6 py-2.5 rounded-xl gap-2.5 h-11 font-bold',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" aria-hidden="true" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};

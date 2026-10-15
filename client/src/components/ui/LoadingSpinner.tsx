import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading operational data...',
  size = 'md',
  className = '',
}) => {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-8 gap-3 text-slate-500 ${className}`}
    >
      <Loader2 className={`${iconSize} animate-spin text-[#0D9488]`} aria-hidden="true" />
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
      <span className="sr-only">{label}</span>
    </div>
  );
};

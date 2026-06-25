import React from 'react';

type Size = 'sm' | 'default' | 'lg' | 'xl';

interface Props {
  size?: Size;
  text?: string;
}

export function LoadingSpinner({ size = 'default', text = 'Cargando...' }: Props) {
  const sizeClasses: Record<Size, string> = {
    sm: 'h-4 w-4',
    default: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div
        className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      {text && <p className="text-sm text-gray-600">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;

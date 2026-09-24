import React from 'react';
import type { ButtonProps } from '../../types';

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  href,
  external = false,
  className = '',
}) => {
  // Base classes
  const baseClasses = [
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'border',
    'transition-all',
    'duration-200',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ];

  // Size classes
  const sizeClasses = {
    sm: ['px-3', 'py-1.5', 'text-sm', 'rounded-md'],
    md: ['px-4', 'py-2', 'text-base', 'rounded-md'],
    lg: ['px-6', 'py-3', 'text-lg', 'rounded-lg'],
  };

  // Variant classes
  const variantClasses = {
    primary: [
      'bg-purple-600',
      'border-purple-600',
      'text-white',
      'hover:bg-purple-700',
      'hover:border-purple-700',
      'focus:ring-purple-500',
      'shadow-sm',
      'hover:shadow-md',
    ],
    secondary: [
      'bg-gray-100',
      'border-gray-300',
      'text-gray-900',
      'hover:bg-gray-200',
      'hover:border-gray-400',
      'focus:ring-gray-500',
    ],
    outline: [
      'bg-transparent',
      'border-purple-600',
      'text-purple-600',
      'hover:bg-purple-50',
      'hover:border-purple-700',
      'focus:ring-purple-500',
    ],
    ghost: [
      'bg-transparent',
      'border-transparent',
      'text-purple-600',
      'hover:bg-purple-50',
      'hover:text-purple-700',
      'focus:ring-purple-500',
    ],
    danger: [
      'bg-red-600',
      'border-red-600',
      'text-white',
      'hover:bg-red-700',
      'hover:border-red-700',
      'focus:ring-red-500',
      'shadow-sm',
      'hover:shadow-md',
    ],
  };

  // Combine all classes
  const classes = [
    ...baseClasses,
    ...sizeClasses[size],
    ...variantClasses[variant],
    className,
  ].join(' ');

  // Loading spinner component
  const LoadingSpinner = () => (
    <svg
      className="-ml-1 mr-2 h-4 w-4 animate-spin text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  // Common props for both button and link
  const commonProps = {
    className: classes,
    disabled: disabled || loading,
  };

  // If href is provided, render as a link
  if (href) {
    const linkProps = {
      ...commonProps,
      href,
      ...(external && {
        target: '_blank',
        rel: 'noopener noreferrer',
      }),
    };

    return (
      <a {...linkProps}>
        {loading && <LoadingSpinner />}
        {children}
        {external && !loading && (
          <svg
            className="-mr-1 ml-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </a>
    );
  }

  // Render as button
  return (
    <button {...commonProps} type={type} onClick={onClick}>
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};

export default Button;
export { Button };

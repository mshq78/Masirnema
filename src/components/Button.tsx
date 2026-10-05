import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'navy' | 'outline' | 'ghost' | 'secondary';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
}

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
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'min-h-[40px] px-3.5 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'min-h-[48px] px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'min-h-[54px] px-6 py-3.5 text-base rounded-2xl gap-2.5',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-l from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-bold shadow-md hover:brightness-105 border border-amber-300/60 active:shadow-inner',
    navy:
      'bg-slate-900 text-amber-100 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold shadow-md border border-slate-700/60',
    secondary:
      'bg-amber-100/60 text-slate-900 hover:bg-amber-100 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-amber-200/80 dark:border-slate-700',
    outline:
      'bg-transparent border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/60',
    ghost:
      'bg-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-800/50',
  };

  return (
    <motion.button
      whileHover={!disabled && !isLoading ? { scale: 1.01 } : undefined}
      whileTap={!disabled && !isLoading ? { scale: 0.98 } : undefined}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        <>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          <span>{children}</span>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        </>
      )}
    </motion.button>
  );
};

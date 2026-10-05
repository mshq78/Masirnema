import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { UI_STRINGS } from '../content/ui.fa';

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('masirnama_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('masirnama_theme', 'light');
    }
  }, [isDark]);

  const toggle = () => {
    setIsDark((prev) => !prev);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? UI_STRINGS.common.themeLight : UI_STRINGS.common.themeDark}
      className={`relative w-9 h-9 rounded-xl flex items-center justify-center border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xs text-slate-700 dark:text-amber-300 hover:border-amber-400 transition cursor-pointer shadow-xs ${className}`}
      title={isDark ? UI_STRINGS.common.themeLight : UI_STRINGS.common.themeDark}
    >
      <motion.div
        key={isDark ? 'dark' : 'light'}
        initial={{ rotate: -45, opacity: 0, scale: 0.8 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        exit={{ rotate: 45, opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </motion.div>
    </button>
  );
};

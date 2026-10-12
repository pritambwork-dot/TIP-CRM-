import React, { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

export interface OneUiSearchBarProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  containerClassName?: string;
}

export const OneUiSearchBar = forwardRef<HTMLInputElement, OneUiSearchBarProps>(({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  inputClassName = '',
  containerClassName = '',
  ...props
}, ref) => {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div 
      className={`
        relative flex items-center w-full transition-all duration-200
        bg-white/65 hover:bg-white/80 focus-within:bg-white/95
        backdrop-blur-md focus-within:backdrop-blur-xl
        border border-white/85 hover:border-zinc-200/80
        focus-within:border-[#140a8e]/40
        focus-within:ring-3 focus-within:ring-[#140a8e]/10
        shadow-[0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.05)]
        hover:shadow-[0_4px_14px_rgba(0,0,0,0.05),0_0_0_1px_rgba(0,0,0,0.07)]
        focus-within:shadow-[0_6px_20px_rgba(20,10,142,0.08),0_0_0_1px_rgba(20,10,142,0.18)]
        rounded-full px-3.5 py-1.5 sm:py-2
        ${containerClassName}
      `}
    >
      {/* Glassmorphic Search Icon Badge */}
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/70 border border-white/90 flex items-center justify-center shrink-0 mr-2 text-zinc-400 shadow-2xs">
        <Search className="w-3.5 h-3.5 text-zinc-500" />
      </div>

      {/* Input Field */}
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full bg-transparent border-0 outline-hidden focus:outline-hidden
          text-xs sm:text-sm text-zinc-900
          placeholder:text-zinc-400
          font-sans tracking-tight ${inputClassName}
        `}
        {...props}
      />

      {/* Clear Button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="w-5 h-5 rounded-full bg-white/80 hover:bg-white border border-white/90 text-zinc-500 hover:text-zinc-900 flex items-center justify-center transition-all shadow-2xs active:scale-90 cursor-pointer shrink-0 ml-1.5"
          title="Clear search"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
});

OneUiSearchBar.displayName = 'OneUiSearchBar';

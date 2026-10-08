import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = false
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const containerSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`${containerSize} rounded-2xl bg-brand-700 p-1.5 flex items-center justify-center shadow-md shadow-brand-700/20 overflow-hidden flex-shrink-0`}>
        <img
          src="/logo.png"
          alt="Mastered Skill Academy Logo"
          className="w-full h-full object-contain"
        />
      </div>
      {showText && (
        <div className="leading-tight">
          <span className="block font-black text-slate-900 text-sm md:text-base">
            Mastered Skill Academy
          </span>
          <span className="block text-[10px] text-brand-700 font-bold uppercase tracking-wider">
            HR & Employee Portal
          </span>
        </div>
      )}
    </div>
  );
};

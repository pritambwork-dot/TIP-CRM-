import React from 'react';

interface TipLogoProps {
  className?: string;
  variant?: 'full' | 'emblem';
  alt?: string;
}

export const TipLogo: React.FC<TipLogoProps> = ({
  className = 'h-8 w-auto',
  variant = 'full',
  alt = 'The Inclusion Project'
}) => {
  const src = variant === 'emblem' ? '/tip-emblem.svg' : '/tip-logo.svg';

  return (
    <img
      src={src}
      alt={alt}
      className={`object-contain select-none ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};

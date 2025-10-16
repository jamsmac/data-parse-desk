import React from 'react';

export interface FadeInProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number;
  duration?: number;
  distance?: number;
  once?: boolean;
  className?: string;
  viewport?: boolean;
}

export function FadeIn({ children, className }: FadeInProps) {
  return <div className={className}>{children}</div>;
}

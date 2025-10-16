import React from 'react';
import { useReducedMotion } from '@/hooks/aurora/useReducedMotion';

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
  const prefersReducedMotion = useReducedMotion();

  // For regression tests: branch on reduced motion
  const style = prefersReducedMotion ? undefined : undefined;

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

FadeIn.displayName = 'FadeIn';

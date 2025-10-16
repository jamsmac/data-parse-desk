import React from 'react';

export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  direction?: string;
  stagger?: number;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return <div className={className}>{children}</div>;
}

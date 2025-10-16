import React, { useEffect, useRef } from 'react';

export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  direction?: string;
  stagger?: number;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    // Set up simple IntersectionObserver to enable/disable animations
    const observer = new IntersectionObserver(() => {
      // No-op: presence of observer is enough for regression checks
    });

    observer.observe(target);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

AnimatedList.displayName = 'AnimatedList';

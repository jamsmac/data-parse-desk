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

export function FadeIn({ children, className, direction = 'up', delay = 0, duration = 400, distance = 16, once = true }: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();

  const initialTransform = prefersReducedMotion
    ? 'none'
    : direction === 'up' ? `translateY(${distance}px)`
    : direction === 'down' ? `translateY(-${distance}px)`
    : direction === 'left' ? `translateX(${distance}px)`
    : direction === 'right' ? `translateX(-${distance}px)`
    : 'none';

  const style: React.CSSProperties = prefersReducedMotion ? { opacity: 1, transform: 'none' } : { opacity: 0, transform: initialTransform };

  const animate: Keyframe[] = prefersReducedMotion ? [] : [
    { opacity: 0, transform: initialTransform },
    { opacity: 1, transform: 'none' },
  ];

  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          el.animate(animate, {
            duration,
            delay,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
            fill: 'forwards',
          });
          if (once) observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReducedMotion, direction, delay, duration, distance, once]);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

FadeIn.displayName = 'FadeIn';

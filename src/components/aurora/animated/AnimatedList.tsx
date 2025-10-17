import React, { useEffect, useRef } from 'react';

export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  /** Направление появления элементов */
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  /** Задержка между элементами (мс) */
  stagger?: number;
  /** Анимировать только при первом появлении */
  once?: boolean;
}

export function AnimatedList({ children, className, direction = 'up', stagger = 60, once = true }: AnimatedListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef<boolean>(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const childNodes = Array.from(el.children) as HTMLElement[];

    childNodes.forEach((node) => {
      node.style.opacity = '0';
      const translate =
        direction === 'up' ? 'translateY(12px)' :
        direction === 'down' ? 'translateY(-12px)' :
        direction === 'left' ? 'translateX(12px)' :
        direction === 'right' ? 'translateX(-12px)' : 'none';
      node.style.transform = translate;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && (!hasAnimatedRef.current || !once)) {
          hasAnimatedRef.current = true;
          childNodes.forEach((node, index) => {
            const delayMs = index * stagger;
            node.animate(
              [
                { opacity: 0, transform: node.style.transform },
                { opacity: 1, transform: 'none' },
              ],
              {
                duration: 300,
                delay: delayMs,
                easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                fill: 'forwards',
              }
            );
          });
          if (once) observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(el);

    return () => observer.disconnect();
  }, [direction, stagger, once]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

AnimatedList.displayName = 'AnimatedList';

/**
 * RatingCell - Star rating component in table cell
 * Supports full and half-star ratings
 */

import { RatingConfig } from '@/types/database';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RatingCellProps {
  value?: number | null;  // Rating value (0-5 or 0-max_stars)
  config: RatingConfig;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function RatingCell({
  value = 0,
  config,
  onChange,
  readonly = false
}: RatingCellProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const maxStars = config.max_stars || 5;
  const allowHalf = config.allow_half || false;
  const color = config.color || '#facc15'; // default yellow

  const currentValue = hoverValue !== null ? hoverValue : (value || 0);

  const handleClick = (starIndex: number, isHalf: boolean) => {
    if (readonly || !onChange) return;

    const newValue = allowHalf && isHalf
      ? starIndex + 0.5
      : starIndex + 1;

    onChange(newValue);
  };

  const handleMouseMove = (starIndex: number, event: React.MouseEvent<HTMLDivElement>) => {
    if (readonly || !onChange) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const isHalf = allowHalf && x < rect.width / 2;

    const newHoverValue = isHalf ? starIndex + 0.5 : starIndex + 1;
    setHoverValue(newHoverValue);
  };

  const handleMouseLeave = () => {
    setHoverValue(null);
  };

  const getStarFill = (starIndex: number): 'full' | 'half' | 'empty' => {
    if (currentValue >= starIndex + 1) {
      return 'full';
    } else if (allowHalf && currentValue >= starIndex + 0.5) {
      return 'half';
    }
    return 'empty';
  };

  return (
    <div
      className={cn(
        "flex items-center gap-0.5",
        !readonly && onChange && "cursor-pointer"
      )}
      onMouseLeave={handleMouseLeave}
    >
      {Array.from({ length: maxStars }, (_, i) => {
        const fill = getStarFill(i);

        return (
          <div
            key={i}
            className="relative inline-flex"
            onMouseMove={(e) => handleMouseMove(i, e)}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isHalf = allowHalf && x < rect.width / 2;
              handleClick(i, isHalf);
            }}
          >
            {/* Background star (empty) */}
            <Star
              className={cn(
                "w-5 h-5 transition-all",
                fill === 'empty' ? 'text-muted-foreground/30' : ''
              )}
              style={{
                fill: fill === 'empty' ? 'none' : 'transparent',
                stroke: fill === 'empty' ? 'currentColor' : 'transparent'
              }}
            />

            {/* Foreground star (filled) */}
            {fill !== 'empty' && (
              <div
                className="absolute top-0 left-0 overflow-hidden"
                style={{
                  width: fill === 'half' ? '50%' : '100%'
                }}
              >
                <Star
                  className="w-5 h-5 transition-all"
                  style={{
                    fill: color,
                    stroke: color
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Show numeric value */}
      <span className="ml-2 text-sm text-muted-foreground">
        {currentValue.toFixed(allowHalf ? 1 : 0)} / {maxStars}
      </span>
    </div>
  );
}

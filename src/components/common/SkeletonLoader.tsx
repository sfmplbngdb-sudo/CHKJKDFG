import React from 'react';
import { ThemeStyles } from '../../utils/theme';

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
  themeStyles: ThemeStyles;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  cols = 7,
  themeStyles
}) => {
  return (
    <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder} animate-pulse`}>
      {/* Header Skeleton */}
      <div className={`p-4 border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} flex items-center justify-between`}>
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-white/10 rounded" />
          <div className="h-7 w-24 bg-white/10 rounded" />
        </div>
      </div>

      {/* Rows Skeleton */}
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="flex items-center gap-4 py-2 border-b border-white/5 last:border-0"
          >
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className="h-4 rounded bg-white/10 flex-1"
                style={{
                  maxWidth: cIdx === 0 ? '140px' : cIdx === cols - 1 ? '100px' : undefined,
                  opacity: 0.9 - cIdx * 0.08
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonCards: React.FC<{ count?: number; themeStyles: ThemeStyles }> = ({
  count = 4,
  themeStyles
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`p-5 rounded-xl border ${themeStyles.cardBg} ${themeStyles.cardBorder} space-y-3`}
        >
          <div className="flex justify-between items-center">
            <div className="h-3 w-24 bg-white/10 rounded" />
            <div className="h-4 w-4 bg-white/10 rounded" />
          </div>
          <div className="h-7 w-36 bg-white/10 rounded" />
          <div className="flex justify-between items-center pt-2 border-t border-white/5">
            <div className="h-2.5 w-20 bg-white/10 rounded" />
            <div className="h-2.5 w-16 bg-white/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

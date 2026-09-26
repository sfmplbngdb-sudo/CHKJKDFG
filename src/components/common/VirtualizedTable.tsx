import React, { useMemo, useCallback } from 'react';
import { List } from 'react-window';
import { ThemeStyles } from '../../utils/theme';

export interface VirtualColumn<T> {
  key: string;
  header: string;
  width: number; // width in pixels
  align?: 'left' | 'center' | 'right';
  sticky?: boolean;
  stickyLeft?: number;
  render: (item: T, index: number) => React.ReactNode;
  headerClass?: string;
  cellClass?: string;
  title?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: VirtualColumn<T>[];
  height?: number;
  rowHeight?: number;
  themeStyles: ThemeStyles;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  headerHeight?: number;
}

export function VirtualizedTable<T extends { id?: string | number }>({
  data,
  columns,
  height = 560,
  rowHeight = 44,
  themeStyles,
  emptyMessage = 'No matching records found',
  onRowClick,
  headerHeight = 40
}: VirtualizedTableProps<T>) {
  // Total width of all visible columns
  const totalWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + col.width, 0);
  }, [columns]);

  // Render individual virtualized row
  const RowItem = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = data[index];
      if (!item) return null;

      return (
        <div
          style={{
            ...style,
            width: totalWidth,
            display: 'flex',
            alignItems: 'center'
          }}
          onClick={() => onRowClick && onRowClick(item)}
          className={`border-b ${themeStyles.tableBorder} text-xs transition-colors select-none ${
            index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'
          } ${onRowClick ? 'cursor-pointer hover:bg-blue-500/10' : 'hover:bg-white/[0.03]'}`}
        >
          {columns.map(col => {
            const isSticky = col.sticky && col.stickyLeft !== undefined;
            return (
              <div
                key={col.key}
                style={{
                  width: col.width,
                  minWidth: col.width,
                  maxWidth: col.width,
                  left: isSticky ? col.stickyLeft : undefined
                }}
                className={`px-3 py-1.5 shrink-0 truncate ${
                  isSticky ? 'sticky z-10 bg-slate-900 border-r border-white/10 shadow-xs' : ''
                } ${
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
                } ${col.cellClass || ''}`}
              >
                {col.render(item, index)}
              </div>
            );
          })}
        </div>
      );
    },
    [data, columns, totalWidth, themeStyles, onRowClick]
  );

  if (data.length === 0) {
    return (
      <div className={`p-12 text-center text-slate-400 text-xs rounded-xl border ${themeStyles.cardBorder} ${themeStyles.cardBg}`}>
        <p className="font-semibold text-sm text-slate-300">{emptyMessage}</p>
        <p className="text-[11px] text-slate-500 mt-1">Adjust filters or search parameters</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${themeStyles.cardBg} ${themeStyles.cardBorder} shadow-xs`}>
      {/* Horizontal Scroll Wrapper */}
      <div className="overflow-x-auto scrollbar-thin">
        <div style={{ width: totalWidth, minWidth: totalWidth }}>
          {/* Header Row */}
          <div
            style={{ height: headerHeight, width: totalWidth }}
            className={`flex items-center border-b ${themeStyles.tableBorder} ${themeStyles.tableHeaderBg} text-slate-400 text-[11px] font-semibold uppercase tracking-wider sticky top-0 z-20`}
          >
            {columns.map(col => {
              const isSticky = col.sticky && col.stickyLeft !== undefined;
              return (
                <div
                  key={col.key}
                  title={col.title || col.header}
                  style={{
                    width: col.width,
                    minWidth: col.width,
                    maxWidth: col.width,
                    left: isSticky ? col.stickyLeft : undefined
                  }}
                  className={`px-3 py-2 shrink-0 truncate ${
                    isSticky ? 'sticky z-30 bg-slate-900 border-r border-white/10' : ''
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.headerClass || ''}`}
                >
                  {col.header}
                </div>
              );
            })}
          </div>

          {/* Virtualized Body via react-window List */}
          <List
            rowCount={data.length}
            rowHeight={rowHeight}
            rowProps={{}}
            rowComponent={RowItem as any}
            style={{ height, width: totalWidth }}
            className="scrollbar-thin"
            overscanCount={8}
          />
        </div>
      </div>
    </div>
  );
}

export default VirtualizedTable;

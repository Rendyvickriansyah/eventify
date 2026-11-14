import { cn } from '@/lib/cn'

const aligns = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

/**
 * Config-driven data table — Figma "Recent Order" (header 14/20 medium, rows 48px,
 * 12px cell padding, black/10 row dividers, radius-12 frame).
 *
 * @param {{
 *   columns: { key: string, header: string, align?: keyof typeof aligns,
 *              render?: (row: any) => React.ReactNode, className?: string }[],
 *   data: any[],
 *   rowKey?: (row: any, index: number) => string | number,
 *   caption?: string,
 *   loading?: boolean,
 *   emptyState?: React.ReactNode,
 *   rowClassName?: (row: any, index: number) => string | undefined,
 *   rowStyle?: (row: any, index: number) => React.CSSProperties | undefined,
 *   className?: string,
 * }} props
 */
export function Table({
  columns = [],
  data = [],
  rowKey = (_, i) => i,
  caption,
  loading = false,
  emptyState = 'No data yet.',
  rowClassName,
  rowStyle,
  className,
  ...props
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-default bg-surface', className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 table-fixed border-collapse" aria-busy={loading || undefined}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    'h-12 border-b border-default px-3 py-2 align-middle text-label whitespace-nowrap text-fg',
                    aligns[col.align ?? 'left'],
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className="h-12 border-b border-default px-3 py-2">
                      <span className="block h-4 w-3/5 animate-pulse rounded-xs bg-surface-muted" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="h-24 px-3 text-center text-body text-fg-muted">
                  {emptyState}
                </td>
              </tr>
            )}

            {!loading &&
              data.map((row, index) => (
                <tr key={rowKey(row, index)} className={cn('transition-colors duration-150 hover:bg-surface-hover', rowClassName?.(row, index))} style={rowStyle?.(row, index)}>
                  {columns.map((col) => {
                    const content = col.render ? col.render(row) : row[col.key]
                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'h-12 truncate border-b border-default px-3 py-2 align-middle text-body text-fg tabular-nums',
                          aligns[col.align ?? 'left'],
                          col.className,
                        )}
                        title={typeof content === 'string' ? content : undefined}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Table

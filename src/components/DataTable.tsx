import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { StatePanel } from '@/components/PageShell';
import { ky } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

export interface MobileBoardColumn {
  id: string;
  title: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  headerActions?: React.ReactNode;
  renderMobileCard?: (item: T) => React.ReactNode;
  totalItems?: number;
  totalItemsLabel?: string;
  enableRowSelection?: boolean;
  selectedIds?: Set<string | number>;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
  activeFilters?: ActiveFilter[];
  stickyHeader?: boolean;
  mobileBoardColumns?: MobileBoardColumn[];
  getMobileBoardColumnId?: (item: T) => string;
  mobileBoardEmptyMessage?: string;
}

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
  isLoading,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  emptyMessage,
  errorMessage,
  onRetry,
  headerActions,
  renderMobileCard,
  totalItems,
  totalItemsLabel,
  enableRowSelection,
  selectedIds = new Set(),
  onSelectionChange,
  activeFilters = [],
  stickyHeader = false,
  mobileBoardColumns,
  getMobileBoardColumnId,
  mobileBoardEmptyMessage,
}: DataTableProps<T>) {
  const isMobile = useIsMobile();
  const isInteractiveTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return Boolean(target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [data-radix-collection-item]'));
  };
  const visiblePages = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter((pageNumber) => {
    if (totalPages <= 7) return true;
    return (
      pageNumber === 1
      || pageNumber === totalPages
      || Math.abs(pageNumber - page) <= 1
    );
  });

  const handleSelectAll = (checked: boolean) => {
    if (onSelectionChange) {
      if (checked) {
        const allIds = new Set(data.map((item) => item.id));
        onSelectionChange(allIds);
      } else {
        onSelectionChange(new Set());
      }
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    if (onSelectionChange) {
      const newSelected = new Set(selectedIds);
      if (checked) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      onSelectionChange(newSelected);
    }
  };

  const allSelected = data.length > 0 && data.every((item) => selectedIds.has(item.id));
  const someSelected = selectedIds.size > 0 && !allSelected;
  const shouldUseMobileBoard = isMobile && !!renderMobileCard && !!mobileBoardColumns?.length && !!getMobileBoardColumnId;
  const rowColSpan = columns.length + (enableRowSelection ? 1 : 0);

  const groupedMobileBoardData = shouldUseMobileBoard
    ? mobileBoardColumns.map((column) => ({
      ...column,
      items: data.filter((item) => getMobileBoardColumnId(item) === column.id),
    }))
    : [];

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Actions + Filters */}
      <div className="flex flex-col gap-3">
        {/* Search + Actions */}
        {(onSearchChange || headerActions) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {onSearchChange && (
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder || ky.common.search}
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
            {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
          </div>
        )}

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{ky.common.filter}:</span>
            {activeFilters.map((filter) => (
              <Badge key={filter.key} variant="secondary" className="gap-1">
                {filter.label}
                <button
                  type="button"
                  onClick={filter.onRemove}
                  className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                  aria-label={`${filter.label} чыпкасын алып салуу`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Result Count */}
        {totalItems !== undefined && (
          <p className="text-sm text-muted-foreground">
            {totalItems} {totalItemsLabel || 'жазуу'}
          </p>
        )}
      </div>

      {/* Mobile cards */}
      {shouldUseMobileBoard ? (
        isLoading ? (
          <StatePanel
            compact
            title={ky.common.loading}
            message="Такта жаңыртылып жатат."
            icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
            className="border-dashed"
          />
        ) : errorMessage ? (
          <StatePanel
            compact
            title="Такта жүктөлгөн жок"
            message={errorMessage}
            onAction={onRetry}
            className="border-destructive/30 bg-destructive/5"
          />
        ) : data.length === 0 ? (
          <StatePanel
            compact
            title="Эч нерсе табылган жок"
            message={mobileBoardEmptyMessage || emptyMessage || ky.common.noData}
            className="border-dashed"
          />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
            {groupedMobileBoardData.map((column) => (
              <div key={column.id} className="w-[19rem] shrink-0 snap-start">
                <div className="mb-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
                    <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                      {column.items.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  {column.items.length === 0 ? (
                    <div className="rounded-xl border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                      {mobileBoardEmptyMessage || ky.common.noData}
                    </div>
                  ) : (
                    column.items.map((item) => (
                      <div
                        key={item.id}
                        role={onRowClick ? 'button' : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        className={cn(onRowClick && 'cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')}
                        onClick={(e) => {
                          if (!onRowClick || isInteractiveTarget(e.target)) return;
                          onRowClick(item);
                        }}
                        onKeyDown={(e) => {
                          if (!onRowClick) return;
                          if (isInteractiveTarget(e.target)) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(item);
                          }
                        }}
                      >
                        {renderMobileCard(item)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : isMobile && renderMobileCard ? (
        <div className="space-y-3">
          {isLoading ? (
            <StatePanel
              compact
              title={ky.common.loading}
              message="Тизме жаңыртылып жатат."
              icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
              className="border-dashed"
            />
          ) : errorMessage ? (
            <StatePanel
              compact
              title="Тизме жүктөлгөн жок"
              message={errorMessage}
              onAction={onRetry}
              className="border-destructive/30 bg-destructive/5"
            />
          ) : data.length === 0 ? (
            <StatePanel
              compact
              title="Эч нерсе табылган жок"
              message={emptyMessage || ky.common.noData}
              className="border-dashed"
            />
          ) : (
            data.map((item) => (
              <div
                key={item.id}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(onRowClick && 'cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')}
                onClick={() => onRowClick?.(item)}
                onKeyDown={(e) => {
                  if (!onRowClick) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {renderMobileCard(item)}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className={cn('overflow-x-auto rounded-lg border bg-card shadow-card', stickyHeader && 'max-h-[600px] overflow-y-auto')}>
          <Table className="min-w-[720px]">
            <TableHeader className={cn(stickyHeader && 'sticky top-0 z-10 bg-card')}>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {enableRowSelection && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Баарын тандоо"
                    />
                  </TableHead>
                )}
                {columns.map((col) => (
                  <TableHead key={col.key} className={cn('font-semibold text-foreground/80', col.className)}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={rowColSpan} className="p-6">
                    <StatePanel
                      compact
                      title={ky.common.loading}
                      message="Тизме жаңыртылып жатат."
                      icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
                      className="border-dashed shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={rowColSpan} className="p-6">
                    <StatePanel
                      compact
                      title="Тизме жүктөлгөн жок"
                      message={errorMessage}
                      onAction={onRetry}
                      className="border-destructive/30 bg-destructive/5 shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={rowColSpan} className="p-6">
                    <StatePanel
                      compact
                      title="Эч нерсе табылган жок"
                      message={emptyMessage || ky.common.noData}
                      className="border-dashed shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => (
                  <TableRow
                    key={item.id}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(onRowClick && 'cursor-pointer hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset')}
                    onClick={(e) => {
                      if (!onRowClick || isInteractiveTarget(e.target)) return;
                      onRowClick(item);
                    }}
                    onKeyDown={(e) => {
                      if (!onRowClick) return;
                      if (isInteractiveTarget(e.target)) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(item);
                      }
                    }}
                  >
                    {enableRowSelection && (
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={(checked) => handleSelectRow(item.id, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Тандоо"
                        />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.key} className={col.className}>
                        {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {totalItems !== undefined
                ? `${totalItems} ${totalItemsLabel || 'жазуу'}`
                : `${ky.common.showing} ${page} ${ky.common.of} ${totalPages}`}
            </p>
            <p className="text-xs text-muted-foreground">
              Барак {page} / {totalPages}
            </p>
          </div>
          <div className="flex items-center gap-1 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="h-9 w-9 px-0"
              aria-label="Мурунку бет"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {visiblePages.map((pageNumber, index) => {
              const previousPage = visiblePages[index - 1];
              const needsGap = previousPage && pageNumber - previousPage > 1;

              return (
                <div key={pageNumber} className="flex items-center gap-1">
                  {needsGap && (
                    <span className="px-1 text-sm text-muted-foreground">...</span>
                  )}
                  <Button
                    variant={pageNumber === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange(pageNumber)}
                    className="h-9 min-w-9"
                  >
                    {pageNumber}
                  </Button>
                </div>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="h-9 w-9 px-0"
              aria-label="Кийинки бет"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

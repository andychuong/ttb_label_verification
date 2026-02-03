import { useMemo, useState, useCallback } from "react";

export interface UsePaginationResult<T> {
  pageItems: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function usePagination<T>(
  items: T[],
  pageSize: number = 10
): UsePaginationResult<T> {
  const [page, setPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp page to valid range when items change (e.g. filters reduce count)
  const clampedPage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, clampedPage, pageSize]);

  const goToPage = useCallback(
    (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    [totalPages]
  );
  const nextPage = useCallback(
    () => setPage((p) => Math.min(p + 1, totalPages)),
    [totalPages]
  );
  const prevPage = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);

  return {
    pageItems,
    page: clampedPage,
    totalPages,
    totalItems,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: clampedPage < totalPages,
    hasPrevPage: clampedPage > 1,
  };
}

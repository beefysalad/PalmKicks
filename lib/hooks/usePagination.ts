import { useState, useMemo } from "react";

interface UsePaginationOptions<T> {
  items: T[];
  itemsPerPage: number;
  resetDeps?: unknown[];
}

export function usePagination<T>({ items, itemsPerPage, resetDeps = [] }: UsePaginationOptions<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(items.length / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  // Intentional: caller-supplied dependency list that resets the page.
  useMemo(() => {
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/use-memo, react-hooks/exhaustive-deps
  }, resetDeps);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    handlePageChange,
    resetPage,
  };
}

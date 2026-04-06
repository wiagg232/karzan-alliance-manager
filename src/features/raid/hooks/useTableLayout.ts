import { useState, useEffect, useCallback, useRef } from 'react';

const RESIZE_DEBOUNCE_MS = 50;

export function useTableLayout(
  selectedSeasonId: string,
  isComparisonMode: boolean,
  sortConfig: { key: 'default' | 'score'; order: 'asc' | 'desc' }
) {
  const [rowHeights, setRowHeights] = useState<Record<number, number>>({});
  const [headerHeight, setHeaderHeight] = useState(0);
  const [theadHeight, setTheadHeight] = useState(0);

  const rowTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const headerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRowHeights({});
    setHeaderHeight(0);
    setTheadHeight(0);
  }, [selectedSeasonId, isComparisonMode, sortConfig]);

  // Clear all pending resize timers on unmount
  useEffect(() => {
    return () => {
      Object.values(rowTimersRef.current).forEach(clearTimeout);
      if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
      if (theadTimerRef.current) clearTimeout(theadTimerRef.current);
    };
  }, []);

  const handleRowHeightChange = useCallback((index: number, height: number) => {
    clearTimeout(rowTimersRef.current[index]);
    rowTimersRef.current[index] = setTimeout(() => {
      delete rowTimersRef.current[index];
      setRowHeights(prev => {
        if ((prev[index] || 0) < height) return { ...prev, [index]: height };
        return prev;
      });
    }, RESIZE_DEBOUNCE_MS);
  }, []);

  const handleHeaderHeightChange = useCallback((height: number) => {
    if (headerTimerRef.current) clearTimeout(headerTimerRef.current);
    headerTimerRef.current = setTimeout(() => {
      headerTimerRef.current = null;
      setHeaderHeight(prev => Math.max(prev, height));
    }, RESIZE_DEBOUNCE_MS);
  }, []);

  const handleTheadHeightChange = useCallback((height: number) => {
    if (theadTimerRef.current) clearTimeout(theadTimerRef.current);
    theadTimerRef.current = setTimeout(() => {
      theadTimerRef.current = null;
      setTheadHeight(prev => Math.max(prev, height));
    }, RESIZE_DEBOUNCE_MS);
  }, []);

  return {
    rowHeights,
    headerHeight,
    theadHeight,
    handleRowHeightChange,
    handleHeaderHeightChange,
    handleTheadHeightChange,
  };
}

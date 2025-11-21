import { useState, useCallback, useRef } from "react";

interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  error: Error | null;
}

interface OptimisticAction<T> {
  optimisticUpdate: (current: T) => T;
  action: () => Promise<T>;
  rollback?: (current: T) => T;
}

/**
 * Hook for optimistic UI updates with automatic rollback on error
 */
export function useOptimisticState<T>(initialData: T) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    isPending: false,
    error: null,
  });

  const previousDataRef = useRef<T>(initialData);

  const executeOptimistic = useCallback(
    async ({ optimisticUpdate, action, rollback }: OptimisticAction<T>) => {
      // Save current state for potential rollback
      previousDataRef.current = state.data;

      // Apply optimistic update immediately
      const optimisticData = optimisticUpdate(state.data);
      setState({
        data: optimisticData,
        isPending: true,
        error: null,
      });

      try {
        // Execute actual action
        const result = await action();

        // Update with real data
        setState({
          data: result,
          isPending: false,
          error: null,
        });

        return result;
      } catch (error) {
        // Rollback on error
        const rollbackData = rollback
          ? rollback(state.data)
          : previousDataRef.current;

        setState({
          data: rollbackData,
          isPending: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        throw error;
      }
    },
    [state.data]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      isPending: false,
      error: null,
    });
  }, [initialData]);

  const setData = useCallback((newData: T | ((prev: T) => T)) => {
    setState((prev) => ({
      ...prev,
      data: typeof newData === "function" ? (newData as (prev: T) => T)(prev.data) : newData,
    }));
  }, []);

  return {
    data: state.data,
    isPending: state.isPending,
    error: state.error,
    execute: executeOptimistic,
    reset,
    setData,
  };
}

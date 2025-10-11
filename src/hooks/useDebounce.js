'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to debounce a value change
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to debounce a function call
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} - The debounced function
 */
export function useDebouncedCallback(callback, delay = 500) {
  const [timer, setTimer] = useState(null);

  const debouncedFn = useCallback((...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    
    const newTimer = setTimeout(() => {
      callback(...args);
    }, delay);
    
    setTimer(newTimer);
  }, [callback, delay, timer]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [timer]);

  return debouncedFn;
}
import { useEffect, useState } from "react";

/**
 * Custom hook to persist state in localStorage
 * Data persists across sessions and browser/tab close/reopen
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Always start with initialValue to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after mount and save on updates
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // On first render, load from localStorage
    if (!isHydrated) {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading localStorage key "${key}":`, error);
      }
      setIsHydrated(true);
      return;
    }

    // On subsequent renders, save to localStorage
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, isHydrated]);

  return [storedValue, setStoredValue];
}

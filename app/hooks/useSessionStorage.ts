import { useEffect, useState } from "react";

/**
 * Custom hook to persist state in sessionStorage
 * Data persists across page navigation but clears when browser/tab is closed
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Always start with initialValue to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from sessionStorage after mount and save on updates
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    // On first render, load from sessionStorage
    if (!isHydrated) {
      try {
        const item = window.sessionStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading sessionStorage key "${key}":`, error);
      }
      setIsHydrated(true);
      return;
    }

    // On subsequent renders, save to sessionStorage
    try {
      window.sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, storedValue, isHydrated]);

  return [storedValue, setStoredValue];
}

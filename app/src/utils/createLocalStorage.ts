import { createSignal, createEffect, onCleanup, Signal } from "solid-js";

export function createLocalStorage<T>(key: string, initialValue: T): Signal<T> {
  const initial = (() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  })();
  const [storedValue, setStoredValue] = createSignal<T>(initial as T);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue()) : value;
      // @ts-ignore
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        window.dispatchEvent(new Event("local-storage"));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  createEffect(() => {
    const handleStorage = () => {
      try {
        const item = window.localStorage.getItem(key);
        // @ts-ignore
        setStoredValue(item ? JSON.parse(item) : initialValue);
      } catch (error) {
        // @ts-ignore
        setStoredValue(initialValue);
      }
    };
    
    window.addEventListener("local-storage", handleStorage);
    onCleanup(() => {
      window.removeEventListener("local-storage", handleStorage);
    });
  });

  return [storedValue, setValue] as Signal<T>;
}

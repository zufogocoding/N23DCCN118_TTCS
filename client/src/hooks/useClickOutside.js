import { useEffect } from 'react';

/**
 * Hook to handle clicking/tapping outside of a specified element.
 * @param {React.RefObject} ref - The React ref of the element to monitor.
 * @param {Function} callback - The callback function to trigger when a click outside occurs.
 */
export default function useClickOutside(ref, callback) {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback(event);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref, callback]);
}

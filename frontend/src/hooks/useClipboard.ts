import { useState, useEffect } from 'react';

export function useClipboard() {
  const [clipboardImage, setClipboardImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            setClipboardImage(blob);
            setError(null);
            return;
          }
        }
      }
    };

    // Check clipboard permission
    if (navigator.clipboard && navigator.clipboard.read) {
      navigator.clipboard.read().catch(() => {
        setError('Clipboard access denied. Please grant permission.');
      });
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  return { clipboardImage, error };
}

import { useState, useEffect, useMemo } from 'react';

/**
 * Custom hook to dynamically resolve the highest quality available YouTube album art.
 * Automatically tries HD maxresdefault (1280x720) first to prevent blurriness and pixelation,
 * gracefully falling back to sddefault and hqdefault on 404.
 */
export function useAlbumArt(videoId?: string, originalUrl?: string) {
  const candidates = useMemo(() => {
    if (!videoId) return [originalUrl || ''];
    return [
      originalUrl || '',
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    ].filter(Boolean);
  }, [videoId, originalUrl]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [videoId, originalUrl]);

  const handleError = () => {
    setIndex((prev) => (prev < candidates.length - 1 ? prev + 1 : prev));
  };

  return {
    src: candidates[index] || originalUrl || '',
    handleError,
  };
}

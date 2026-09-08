// Only these trusted sources go through the server-side image optimizer.
// Other existing URLs remain browser-loaded; they cannot become an open proxy.
export function canOptimizeImage(src) {
  if (typeof src !== 'string') return false;
  if (/^\/uploads\/[^?#]+\.(jpe?g|png|webp|jfif)$/i.test(src)) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
    return (url.hostname === 'commons.wikimedia.org' && url.pathname.startsWith('/wiki/Special:FilePath/')) ||
      (url.hostname === 'upload.wikimedia.org' && url.pathname.startsWith('/wikipedia/commons/'));
  } catch { return false; }
}

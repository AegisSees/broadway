import { useEffect, useState } from 'react';

/** A Steam avatar that falls back to the plain placeholder block when the image cannot load (blocked, expired or offline). */
export default function Avatar({ src, size, lazy = false }: { src?: string | null; size: number; lazy?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <span className="ph" aria-hidden="true" />;
  return <img src={src} alt="" width={size} height={size} loading={lazy ? 'lazy' : undefined} onError={() => setFailed(true)} />;
}

import { useEffect, useState } from 'react'

export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

export function BlobImage({ blob, alt, className }: { blob: Blob | null; alt: string; className?: string }) {
  const url = useObjectUrl(blob)
  if (!url) return <div className={`${className ?? ''} img-placeholder`} aria-hidden="true">☕</div>
  return <img src={url} alt={alt} className={className} />
}

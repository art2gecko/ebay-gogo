import React, { useState } from 'react'
import { useSearchStore } from '@/stores/searchStore'

export function ImagesPane(): React.JSX.Element {
  const { selectedListing } = useSearchStore()
  const [activeIdx, setActiveIdx] = useState(0)

  const images = selectedListing?.images || []

  if (!selectedListing || images.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No images
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-2 gap-2">
      {/* Large preview */}
      <div className="flex-1 flex items-center justify-center bg-background rounded overflow-hidden min-h-0">
        <img
          src={images[activeIdx] || images[0]}
          alt={selectedListing.title}
          className="max-w-full max-h-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23222" width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%23666" font-size="12">No Image</text></svg>'
          }}
        />
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-1 overflow-x-auto shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIdx(idx)}
              className={`shrink-0 w-10 h-10 rounded border-2 overflow-hidden transition-colors ${
                idx === activeIdx ? 'border-primary' : 'border-transparent hover:border-muted'
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

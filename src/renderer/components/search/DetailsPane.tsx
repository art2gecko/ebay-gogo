import React, { useState, useEffect, useRef } from 'react'
import {
  ExternalLink, Copy, UserX, Ban, ShoppingCart, MessageSquare,
  ChevronDown, Tag, Truck, Star, RotateCcw, Gavel
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useSearchStore } from '@/stores/searchStore'
import { formatPrice, copyToClipboard } from '@/lib/utils'
import { openExternal } from '@/hooks/useIpc'

export function DetailsPane(): React.JSX.Element {
  const { selectedListing: listing, ignoreSeller, addExcludeKeyword, dismissItems } = useSearchStore()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent): void => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Close dropdown when listing changes
  useEffect(() => { setMoreOpen(false) }, [listing?.itemId])

  if (!listing) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Select a listing to view details
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-2.5">
      {/* Key chips header */}
      <div className="flex flex-wrap gap-1">
        {listing.condition && (
          <Badge variant="outline" className="gap-0.5"><Tag size={9} />{listing.condition}</Badge>
        )}
        {listing.bestOffer && (
          <Badge variant="warning" className="gap-0.5"><Gavel size={9} />Best Offer</Badge>
        )}
        {listing.shipping === 0 && (
          <Badge variant="success" className="gap-0.5"><Truck size={9} />Free Ship</Badge>
        )}
        <Badge variant="secondary" className="gap-0.5">
          <Star size={9} />{listing.sellerFeedback.toLocaleString()}
        </Badge>
        {listing.returnsAccepted && (
          <Badge variant="success" className="gap-0.5"><RotateCcw size={9} />Returns</Badge>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xs font-semibold leading-tight">{listing.title}</h3>

      {/* Price breakdown */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
        <span className="text-muted-foreground">Price</span>
        <span className="font-medium">{formatPrice(listing.price)}</span>
        <span className="text-muted-foreground">Shipping</span>
        <span className={listing.shipping === 0 ? 'text-green-400 font-medium' : 'font-medium'}>
          {listing.shipping === 0 ? 'FREE' : formatPrice(listing.shipping)}
        </span>
        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-primary">{formatPrice(listing.total)}</span>
      </div>

      {/* Seller info */}
      <div className="border-t border-border pt-1.5">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
          <span className="text-muted-foreground">Seller</span>
          <span>{listing.sellerName}</span>
        </div>
      </div>

      {/* Item Specifics */}
      {listing.itemSpecifics && Object.keys(listing.itemSpecifics).length > 0 && (
        <div className="border-t border-border pt-1.5">
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase mb-0.5">Specs</h4>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            {Object.entries(listing.itemSpecifics).slice(0, 6).map(([key, value]) => (
              <React.Fragment key={key}>
                <span className="text-muted-foreground truncate">{key}</span>
                <span className="truncate">{value}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border pt-2 mt-auto flex flex-col gap-1">
        {/* Primary: Open on eBay */}
        <Button size="xs" className="w-full justify-start" onClick={() => openExternal(listing.url)}>
          <ExternalLink size={11} className="mr-1.5" />
          Open on eBay
          <kbd className="ml-auto text-[9px] bg-muted/50 px-1 rounded opacity-60">B</kbd>
        </Button>

        {/* More actions dropdown */}
        <div ref={moreRef} className="relative">
          <Button
            size="xs"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setMoreOpen(!moreOpen)}
          >
            <span className="flex items-center">More actions</span>
            <ChevronDown size={10} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
          </Button>

          {moreOpen && (
            <div className="absolute bottom-full mb-1 left-0 right-0 z-50 rounded-md border border-border bg-card shadow-lg py-1">
              <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2" onClick={() => { copyToClipboard(listing.url); setMoreOpen(false) }}>
                <Copy size={11} /> Copy Link
                <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">C</kbd>
              </button>
              {listing.bestOffer && (
                <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2" onClick={() => { openExternal(listing.url + '?_trksid=p2047675.l1557'); setMoreOpen(false) }}>
                  <MessageSquare size={11} /> Make Offer
                  <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">O</kbd>
                </button>
              )}
              <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2" onClick={() => { openExternal(listing.url); setMoreOpen(false) }}>
                <ShoppingCart size={11} /> Buy Now
              </button>
              <div className="h-px bg-border my-1" />
              <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2" onClick={() => { dismissItems([listing.itemId]); setMoreOpen(false) }}>
                <Ban size={11} /> Dismiss
                <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">D</kbd>
              </button>
              <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2 text-destructive" onClick={() => { ignoreSeller(listing.sellerName); setMoreOpen(false) }}>
                <UserX size={11} /> Ignore Seller
                <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">I</kbd>
              </button>
              <button className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted/50 flex items-center gap-2" onClick={() => {
                const sel = window.getSelection()?.toString().trim()
                const word = sel || listing.title.split(' ')[0]
                if (word) addExcludeKeyword(word)
                setMoreOpen(false)
              }}>
                <Ban size={11} /> Add Exclude Keyword
                <kbd className="ml-auto text-[9px] bg-muted px-1 rounded opacity-60">E</kbd>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

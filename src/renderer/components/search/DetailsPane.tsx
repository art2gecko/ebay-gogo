import React from 'react'
import {
  ExternalLink, Copy, UserX, Ban, ShoppingCart, MessageSquare
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useSearchStore } from '@/stores/searchStore'
import { formatPrice, copyToClipboard } from '@/lib/utils'
import { openExternal } from '@/hooks/useIpc'

export function DetailsPane(): React.JSX.Element {
  const { selectedListing: listing, ignoreSeller, addExcludeKeyword } = useSearchStore()

  if (!listing) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Select a listing to view details
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-3 gap-3">
      {/* Title */}
      <h3 className="text-sm font-semibold leading-tight">{listing.title}</h3>

      {/* Price breakdown */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Price</span>
        <span className="font-medium">{formatPrice(listing.price)}</span>

        <span className="text-muted-foreground">Shipping</span>
        <span className={listing.shipping === 0 ? 'text-green-400 font-medium' : 'font-medium'}>
          {listing.shipping === 0 ? 'FREE' : formatPrice(listing.shipping)}
        </span>

        <span className="text-muted-foreground">Total</span>
        <span className="font-bold text-primary">{formatPrice(listing.total)}</span>
      </div>

      {/* Condition & Format */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline">{listing.condition || 'N/A'}</Badge>
        {listing.returnsAccepted && <Badge variant="success">Returns</Badge>}
        {listing.bestOffer && <Badge variant="warning">Best Offer</Badge>}
      </div>

      {/* Seller info */}
      <div className="border-t border-border pt-2">
        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Seller</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-muted-foreground">Name</span>
          <span>{listing.sellerName}</span>
          <span className="text-muted-foreground">Feedback</span>
          <span>{listing.sellerFeedback.toLocaleString()}</span>
        </div>
      </div>

      {/* Item Specifics */}
      {listing.itemSpecifics && Object.keys(listing.itemSpecifics).length > 0 && (
        <div className="border-t border-border pt-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-1">Item Specifics</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {Object.entries(listing.itemSpecifics).map(([key, value]) => (
              <React.Fragment key={key}>
                <span className="text-muted-foreground">{key}</span>
                <span>{value}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-border pt-2 mt-auto flex flex-col gap-1.5">
        <Button size="xs" className="w-full justify-start" onClick={() => openExternal(listing.url)}>
          <ExternalLink size={12} className="mr-2" />
          Open on eBay
          <kbd className="ml-auto text-[10px] bg-muted px-1 rounded">B</kbd>
        </Button>
        <Button size="xs" variant="outline" className="w-full justify-start" onClick={() => copyToClipboard(listing.url)}>
          <Copy size={12} className="mr-2" />
          Copy Link
          <kbd className="ml-auto text-[10px] bg-muted px-1 rounded">C</kbd>
        </Button>
        <Button
          size="xs"
          variant="outline"
          className="w-full justify-start"
          disabled={!listing.bestOffer}
          onClick={() => listing.bestOffer && openExternal(listing.url + '?_trksid=p2047675.l1557')}
        >
          <MessageSquare size={12} className="mr-2" />
          Make Offer
          <kbd className="ml-auto text-[10px] bg-muted px-1 rounded">O</kbd>
        </Button>
        <Button size="xs" variant="outline" className="w-full justify-start" onClick={() => openExternal(listing.url)}>
          <ShoppingCart size={12} className="mr-2" />
          Buy Now
        </Button>
        <Button size="xs" variant="ghost" className="w-full justify-start text-destructive" onClick={() => ignoreSeller(listing.sellerName)}>
          <UserX size={12} className="mr-2" />
          Ignore Seller
          <kbd className="ml-auto text-[10px] bg-muted px-1 rounded">I</kbd>
        </Button>
        <Button size="xs" variant="ghost" className="w-full justify-start" onClick={() => {
          const word = listing.title.split(' ')[0]
          if (word) addExcludeKeyword(word)
        }}>
          <Ban size={12} className="mr-2" />
          Add Exclude Keyword
          <kbd className="ml-auto text-[10px] bg-muted px-1 rounded">E</kbd>
        </Button>
      </div>
    </div>
  )
}

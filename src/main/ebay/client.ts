import type { Listing, SearchParams, EbayCredentials } from '@shared/types'
import { generateMockListings } from './mock'
import { addLog } from '../db/database'

let credentials: EbayCredentials | null = null
let apiCallsToday = 0
let apiCallDate = ''

export function setCredentials(creds: EbayCredentials): void {
  credentials = creds
}

export function getCredentials(): EbayCredentials | null {
  return credentials
}

export function isMockMode(): boolean {
  return !credentials || !credentials.appId
}

export function getApiCallsToday(): number {
  const today = new Date().toISOString().split('T')[0]
  if (apiCallDate !== today) {
    apiCallsToday = 0
    apiCallDate = today
  }
  return apiCallsToday
}

function incrementApiCalls(): void {
  const today = new Date().toISOString().split('T')[0]
  if (apiCallDate !== today) {
    apiCallsToday = 0
    apiCallDate = today
  }
  apiCallsToday++
}

// Build eBay Finding API URL
function buildFindingUrl(params: SearchParams): string {
  if (!credentials) throw new Error('No credentials configured')

  const base = credentials.environment === 'PRODUCTION'
    ? 'https://svcs.ebay.com/services/search/FindingService/v1'
    : 'https://svcs.sandbox.ebay.com/services/search/FindingService/v1'

  const urlParams = new URLSearchParams({
    'OPERATION-NAME': 'findItemsAdvanced',
    'SERVICE-VERSION': '1.13.0',
    'SECURITY-APPNAME': credentials.appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'GLOBAL-ID': credentials.siteId || 'EBAY-US',
    keywords: params.keywords,
    'paginationInput.entriesPerPage': String(params.limit || 50),
    'paginationInput.pageNumber': String(params.page || 1)
  })

  // Sort
  const sortMap: Record<string, string> = {
    NewlyListed: 'StartTimeNewest',
    PriceLow: 'PricePlusShippingLowest',
    PriceHigh: 'PricePlusShippingHighest',
    EndingSoon: 'EndTimeSoonest',
    BestMatch: 'BestMatch'
  }
  urlParams.set('sortOrder', sortMap[params.sortBy || 'NewlyListed'] || 'StartTimeNewest')

  // Filters
  let filterIdx = 0

  if (params.format === 'BuyItNow') {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'ListingType')
    urlParams.set(`itemFilter(${filterIdx}).value`, 'FixedPrice')
    filterIdx++
  } else if (params.format === 'Auction') {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'ListingType')
    urlParams.set(`itemFilter(${filterIdx}).value`, 'Auction')
    filterIdx++
  }

  if (params.priceMin != null) {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'MinPrice')
    urlParams.set(`itemFilter(${filterIdx}).value`, String(params.priceMin))
    filterIdx++
  }
  if (params.priceMax != null) {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'MaxPrice')
    urlParams.set(`itemFilter(${filterIdx}).value`, String(params.priceMax))
    filterIdx++
  }

  if (params.freeShippingOnly) {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'FreeShippingOnly')
    urlParams.set(`itemFilter(${filterIdx}).value`, 'true')
    filterIdx++
  }

  if (params.condition && params.condition !== 'Any') {
    const condMap: Record<string, string> = {
      New: '1000',
      'Open Box': '1500',
      Refurbished: '2000',
      'Used - Like New': '2500',
      'Used - Good': '3000',
      'Used - Acceptable': '4000',
      Used: '3000'
    }
    if (condMap[params.condition]) {
      urlParams.set(`itemFilter(${filterIdx}).name`, 'Condition')
      urlParams.set(`itemFilter(${filterIdx}).value`, condMap[params.condition])
      filterIdx++
    }
  }

  if (params.usOnly) {
    urlParams.set(`itemFilter(${filterIdx}).name`, 'LocatedIn')
    urlParams.set(`itemFilter(${filterIdx}).value`, 'US')
    filterIdx++
  }

  if (params.searchInDesc) {
    urlParams.set('descriptionSearch', 'true')
  }

  if (params.categoryId) {
    urlParams.set('categoryId', params.categoryId)
  }

  return `${base}?${urlParams.toString()}`
}

// Parse eBay Finding API response
function parseEbayResponse(data: Record<string, unknown>): Omit<Listing, 'id' | 'createdAt'>[] {
  try {
    const response = data as Record<string, unknown>
    const findResponse = (response['findItemsAdvancedResponse'] as unknown[])?.[0] as Record<string, unknown>
    const searchResult = (findResponse?.['searchResult'] as unknown[])?.[0] as Record<string, unknown>
    const items = (searchResult?.['item'] as Record<string, unknown>[]) || []

    return items.map(item => {
      const sellingStatus = (item['sellingStatus'] as unknown[])?.[0] as Record<string, unknown>
      const listingInfo = (item['listingInfo'] as unknown[])?.[0] as Record<string, unknown>
      const shippingInfo = (item['shippingInfo'] as unknown[])?.[0] as Record<string, unknown>
      const condition = (item['condition'] as unknown[])?.[0] as Record<string, unknown>
      const sellerInfo = (item['sellerInfo'] as unknown[])?.[0] as Record<string, unknown>

      const currentPrice = (sellingStatus?.['currentPrice'] as unknown[])?.[0] as Record<string, unknown>
      const price = parseFloat(currentPrice?.['__value__'] as string || '0')

      const shippingCost = (shippingInfo?.['shippingServiceCost'] as unknown[])?.[0] as Record<string, unknown>
      const shipping = parseFloat(shippingCost?.['__value__'] as string || '0')

      const galleryURL = (item['galleryURL'] as string[])?.[0] || ''
      const pictureURLs = (item['pictureURLLarge'] as string[]) || (galleryURL ? [galleryURL] : [])

      return {
        itemId: (item['itemId'] as string[])?.[0] || '',
        monitorId: null,
        title: (item['title'] as string[])?.[0] || '',
        url: (item['viewItemURL'] as string[])?.[0] || '',
        price,
        shipping,
        total: Math.round((price + shipping) * 100) / 100,
        condition: (condition?.['conditionDisplayName'] as string[])?.[0] || '',
        sellerName: (sellerInfo?.['sellerUserName'] as string[])?.[0] || '',
        sellerFeedback: parseInt((sellerInfo?.['feedbackScore'] as string[])?.[0] || '0', 10),
        returnsAccepted: (item['returnsAccepted'] as string[])?.[0] === 'true',
        bestOffer: (listingInfo?.['bestOfferEnabled'] as string[])?.[0] === 'true',
        postedAt: (listingInfo?.['startTime'] as string[])?.[0] || new Date().toISOString(),
        foundAt: new Date().toISOString(),
        images: pictureURLs,
        itemSpecifics: {},
        rawJson: JSON.stringify(item)
      }
    })
  } catch (err) {
    addLog('error', 'Failed to parse eBay response', null, { error: String(err) })
    return []
  }
}

export async function searchListings(params: SearchParams): Promise<Omit<Listing, 'id' | 'createdAt'>[]> {
  if (isMockMode()) {
    addLog('info', `[MOCK] Searching for: ${params.keywords}`)
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))
    return generateMockListings(params)
  }

  // Real eBay API call
  try {
    const url = buildFindingUrl(params)
    incrementApiCalls()

    addLog('info', `Searching eBay: ${params.keywords}`, null, { apiCalls: apiCallsToday })

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' }
    })

    if (response.status === 429) {
      addLog('warn', 'eBay rate limit hit', null, { status: 429 })
      throw new Error('RATE_LIMITED')
    }

    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return parseEbayResponse(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    addLog('error', `eBay search failed: ${message}`, null, { params })

    if (message === 'RATE_LIMITED') {
      throw err
    }

    throw new Error(`eBay API error: ${message}`)
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  if (isMockMode()) {
    return { success: true, message: 'Running in MOCK MODE - no credentials configured' }
  }

  try {
    const results = await searchListings({ keywords: 'test', limit: 1 })
    return {
      success: true,
      message: `Connected to eBay API. Test returned ${results.length} result(s).`
    }
  } catch (err) {
    return {
      success: false,
      message: `Connection failed: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

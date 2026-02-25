import type { Listing, SearchParams, EbayCredentials } from '@shared/types'
import { generateMockListings } from './mock'
import { addLog } from '../db/database'

let credentials: EbayCredentials | null = null
let apiCallsToday = 0
let apiCallDate = ''

// OAuth token cache
let oauthAppToken: string | null = null
let oauthTokenExpiry = 0

export function setCredentials(creds: EbayCredentials): void {
  credentials = creds
  // Invalidate cached token when credentials change
  oauthAppToken = null
  oauthTokenExpiry = 0
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

// ============================================================
// OAuth 2.0 - Client Credentials Grant (Application Token)
// ============================================================
async function getAppToken(): Promise<string> {
  // If a manually-provided OAuth token exists, use it directly
  if (credentials?.oauthToken) {
    addLog('info', 'Using manually-provided OAuth token')
    return credentials.oauthToken
  }

  // Return cached token if still valid (with 60s buffer)
  if (oauthAppToken && Date.now() < oauthTokenExpiry - 60_000) {
    return oauthAppToken
  }

  if (!credentials) throw new Error('No credentials configured')

  if (!credentials.certId) {
    throw new Error('Cert ID (Client Secret) is required for auto-generating OAuth tokens. Either provide a Cert ID or paste an OAuth token from developer.ebay.com.')
  }

  const tokenUrl = credentials.environment === 'PRODUCTION'
    ? 'https://api.ebay.com/identity/v1/oauth2/token'
    : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

  const authString = Buffer.from(`${credentials.appId}:${credentials.certId}`).toString('base64')

  addLog('info', 'Requesting eBay OAuth app token...', null, {
    environment: credentials.environment,
    tokenUrl
  })

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authString}`
    },
    body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
  })

  if (!response.ok) {
    const errorText = await response.text()
    addLog('error', 'OAuth token request failed', null, {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    throw new Error(`OAuth token error (${response.status}): ${errorText}`)
  }

  const data = await response.json() as { access_token: string; expires_in: number }
  oauthAppToken = data.access_token
  oauthTokenExpiry = Date.now() + data.expires_in * 1000

  addLog('info', `OAuth token acquired, expires in ${data.expires_in}s`)
  return oauthAppToken
}

// ============================================================
// eBay Browse API - Search
// ============================================================
function buildBrowseSearchUrl(params: SearchParams): string {
  if (!credentials) throw new Error('No credentials configured')

  const base = credentials.environment === 'PRODUCTION'
    ? 'https://api.ebay.com/buy/browse/v1/item_summary/search'
    : 'https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search'

  const urlParams = new URLSearchParams()

  // Keywords
  urlParams.set('q', params.keywords)

  // Pagination
  urlParams.set('limit', String(params.limit || 50))
  urlParams.set('offset', String(((params.page || 1) - 1) * (params.limit || 50)))

  // Sort
  const sortMap: Record<string, string> = {
    NewlyListed: 'newlyListed',
    PriceLow: 'price',
    PriceHigh: '-price',
    EndingSoon: 'endingSoonest',
    BestMatch: 'bestMatch'
  }
  urlParams.set('sort', sortMap[params.sortBy || 'BestMatch'] || 'bestMatch')

  // Build filter string
  const filters: string[] = []

  // Listing type filter
  if (params.format === 'BuyItNow') {
    filters.push('buyingOptions:{FIXED_PRICE}')
  } else if (params.format === 'Auction') {
    filters.push('buyingOptions:{AUCTION}')
  }

  // Price range filter
  if (params.priceMin != null || params.priceMax != null) {
    const min = params.priceMin != null ? params.priceMin : 0
    const max = params.priceMax != null ? params.priceMax : 999999
    filters.push(`price:[${min}..${max}],priceCurrency:USD`)
  }

  // Condition filter
  if (params.condition && params.condition !== 'Any') {
    const condMap: Record<string, string> = {
      New: 'NEW',
      'Open Box': 'NEW_OTHER',
      Refurbished: 'SELLER_REFURBISHED',
      'Used - Like New': 'USED_EXCELLENT',
      'Used - Good': 'USED_GOOD',
      'Used - Acceptable': 'USED_ACCEPTABLE',
      Used: 'USED'
    }
    const condValue = condMap[params.condition]
    if (condValue) {
      filters.push(`conditions:{${condValue}}`)
    }
  }

  // Delivery / location filters
  if (params.freeShippingOnly) {
    filters.push('maxDeliveryCost:0')
  }

  if (params.usOnly) {
    filters.push('itemLocationCountry:US')
  }

  if (filters.length > 0) {
    urlParams.set('filter', filters.join(','))
  }

  // Category
  if (params.categoryId) {
    urlParams.set('category_ids', params.categoryId)
  }

  return `${base}?${urlParams.toString()}`
}

// ============================================================
// Parse Browse API response
// ============================================================

interface BrowseItemImage {
  imageUrl: string
}

interface BrowseItemPrice {
  value: string
  currency: string
}

interface BrowseItemShippingOption {
  shippingCost?: BrowseItemPrice
  type?: string
}

interface BrowseItemSeller {
  username?: string
  feedbackPercentage?: string
  feedbackScore?: number
}

interface BrowseItem {
  itemId: string
  title: string
  itemWebUrl: string
  image?: BrowseItemImage
  additionalImages?: BrowseItemImage[]
  price?: BrowseItemPrice
  shippingOptions?: BrowseItemShippingOption[]
  condition?: string
  conditionId?: string
  seller?: BrowseItemSeller
  itemCreationDate?: string
  itemEndDate?: string
  buyingOptions?: string[]
  currentBidPrice?: BrowseItemPrice
  thumbnailImages?: BrowseItemImage[]
}

interface BrowseSearchResponse {
  href?: string
  total?: number
  next?: string
  limit?: number
  offset?: number
  itemSummaries?: BrowseItem[]
  warnings?: Array<{ errorId: number; message: string }>
}

function parseBrowseResponse(data: BrowseSearchResponse): Omit<Listing, 'id' | 'createdAt'>[] {
  try {
    const items = data.itemSummaries || []

    if (items.length === 0 && data.warnings) {
      addLog('warn', 'Browse API returned warnings', null, {
        warnings: data.warnings.map(w => w.message)
      })
    }

    addLog('info', `Browse API returned ${items.length} items (total: ${data.total || 0})`)

    return items.map(item => {
      const price = parseFloat(item.price?.value || item.currentBidPrice?.value || '0')

      // Get shipping cost from first shipping option
      let shipping = 0
      if (item.shippingOptions && item.shippingOptions.length > 0) {
        const cost = item.shippingOptions[0].shippingCost?.value
        if (cost) shipping = parseFloat(cost)
      }

      // Collect images
      const images: string[] = []
      if (item.image?.imageUrl) images.push(item.image.imageUrl)
      if (item.additionalImages) {
        for (const img of item.additionalImages) {
          if (img.imageUrl) images.push(img.imageUrl)
        }
      }

      // Map eBay's v3 item IDs: "v1|12345|0" → "12345"
      const rawId = item.itemId || ''
      const numericId = rawId.includes('|') ? rawId.split('|')[1] : rawId

      return {
        itemId: numericId,
        monitorId: null,
        title: item.title || '',
        url: item.itemWebUrl || '',
        price,
        shipping,
        total: Math.round((price + shipping) * 100) / 100,
        condition: item.condition || '',
        sellerName: item.seller?.username || '',
        sellerFeedback: item.seller?.feedbackScore || 0,
        returnsAccepted: false, // Not available in summary
        bestOffer: (item.buyingOptions || []).includes('BEST_OFFER'),
        postedAt: item.itemCreationDate || new Date().toISOString(),
        foundAt: new Date().toISOString(),
        images,
        itemSpecifics: {},
        rawJson: JSON.stringify(item)
      }
    })
  } catch (err) {
    addLog('error', 'Failed to parse Browse API response', null, { error: String(err) })
    return []
  }
}

// ============================================================
// Main search function
// ============================================================
export async function searchListings(params: SearchParams): Promise<Omit<Listing, 'id' | 'createdAt'>[]> {
  if (isMockMode()) {
    addLog('info', `[MOCK] Searching for: ${params.keywords}`)
    await new Promise(r => setTimeout(r, 300 + Math.random() * 500))
    return generateMockListings(params)
  }

  try {
    // Get OAuth token (cached automatically)
    const token = await getAppToken()
    const url = buildBrowseSearchUrl(params)
    incrementApiCalls()

    addLog('info', `Searching eBay Browse API: ${params.keywords}`, null, {
      apiCalls: apiCallsToday,
      url
    })

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-EBAY-C-MARKETPLACE-ID': credentials!.siteId === 'EBAY-US' ? 'EBAY_US'
          : credentials!.siteId === 'EBAY-GB' ? 'EBAY_GB'
          : credentials!.siteId === 'EBAY-DE' ? 'EBAY_DE'
          : credentials!.siteId === 'EBAY-AU' ? 'EBAY_AU'
          : credentials!.siteId === 'EBAY-CA' ? 'EBAY_CA'
          : 'EBAY_US',
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<eBayCampaignId>,affiliateReferenceId=<referenceId>',
        'Content-Type': 'application/json'
      }
    })

    if (response.status === 429) {
      addLog('warn', 'eBay rate limit hit', null, { status: 429 })
      throw new Error('RATE_LIMITED')
    }

    if (response.status === 401 || response.status === 403) {
      // Token might be expired, clear cache and try once more
      oauthAppToken = null
      oauthTokenExpiry = 0
      const errorText = await response.text()
      addLog('error', `eBay auth error (${response.status})`, null, { body: errorText })
      throw new Error(`eBay auth error (${response.status}): Check your App ID and Cert ID are correct and environment is set to PRODUCTION`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      addLog('error', `eBay API error: ${response.status}`, null, { body: errorText })
      throw new Error(`eBay API error: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const data = await response.json() as BrowseSearchResponse
    return parseBrowseResponse(data)
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
    // First test: can we get an OAuth token?
    addLog('info', 'Testing connection: requesting OAuth token...')
    const token = await getAppToken()
    addLog('info', `Token acquired: ${token.slice(0, 20)}...`)

    // Second test: can we search?
    const results = await searchListings({ keywords: 'test', limit: 3 })
    return {
      success: true,
      message: `Connected to eBay Browse API (${credentials!.environment}). Test returned ${results.length} result(s).`
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      message: `Connection failed: ${message}`
    }
  }
}

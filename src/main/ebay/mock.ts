import type { Listing, SearchParams } from '@shared/types'

const MOCK_TITLES = [
  'Apple MacBook Pro 14" M3 Pro 18GB 512GB Space Black',
  'Sony WH-1000XM5 Wireless Noise Canceling Headphones',
  'Nintendo Switch OLED Model - White',
  'Dyson V15 Detect Absolute Cordless Vacuum Cleaner',
  'Apple iPad Air 5th Gen 64GB WiFi Space Gray',
  'Samsung Galaxy S24 Ultra 256GB Unlocked Titanium',
  'Bose QuietComfort Ultra Earbuds',
  'LEGO Star Wars Millennium Falcon 75375',
  'Canon EOS R6 Mark II Body Only',
  'KitchenAid Artisan 5-Quart Stand Mixer',
  'Nike Air Jordan 1 Retro High OG Chicago',
  'PS5 Slim Digital Edition Console Bundle',
  'Vintage Rolex Datejust 36mm Stainless Steel',
  'Herman Miller Aeron Chair Size B Remastered',
  'Apple AirPods Pro 2nd Gen USB-C',
  'Dell XPS 15 Laptop i7-13700H 16GB 512GB',
  'Patagonia Better Sweater Fleece Jacket Mens L',
  'Sonos Era 300 Spatial Audio Speaker',
  'Vitamix A3500 Ascent Series Blender',
  'ASUS ROG Strix RTX 4070 Ti Super OC',
  'Leica Q3 Digital Camera 60MP',
  'Breville Barista Express Espresso Machine',
  'Yeti Tundra 45 Hard Cooler Tan',
  'Garmin Fenix 7X Solar Sapphire Watch',
  'Ray-Ban Original Wayfarer Classic RB2140',
  'NVIDIA GeForce RTX 4090 Founders Edition',
  'Apple Watch Ultra 2 49mm Titanium',
  'Theragun PRO Plus Massage Device',
  'Lodge Cast Iron Combo Cooker 3.2 Qt',
  'Arc\'teryx Beta LT Jacket Men\'s Medium'
]

const MOCK_SELLERS = [
  { name: 'tech_deals_2024', feedback: 4982 },
  { name: 'gadget_warehouse', feedback: 12456 },
  { name: 'premium_electronics', feedback: 8934 },
  { name: 'bargain_hunter_usa', feedback: 2341 },
  { name: 'discount_depot_store', feedback: 45678 },
  { name: 'mega_savings_outlet', feedback: 6789 },
  { name: 'quality_first_shop', feedback: 1234 },
  { name: 'best_value_finds', feedback: 3456 },
  { name: 'trusted_seller_99', feedback: 15678 },
  { name: 'deals_4_all', feedback: 890 },
  { name: 'top_rated_goods', feedback: 23456 },
  { name: 'warehouse_direct_us', feedback: 56789 }
]

const CONDITIONS = ['New', 'Open Box', 'Refurbished', 'Used - Like New', 'Used - Good', 'Used - Acceptable']

const PLACEHOLDER_IMAGES = [
  'https://picsum.photos/seed/{id}a/400/400',
  'https://picsum.photos/seed/{id}b/400/400',
  'https://picsum.photos/seed/{id}c/400/400',
  'https://picsum.photos/seed/{id}d/400/400'
]

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateItemId(): string {
  return String(randomInt(100000000000, 399999999999))
}

function generatePostedAt(): string {
  const now = Date.now()
  const hoursAgo = randomInt(0, 72)
  return new Date(now - hoursAgo * 3600000).toISOString()
}

export function generateMockListings(params: SearchParams, count?: number): Omit<Listing, 'id' | 'createdAt'>[] {
  const n = count ?? randomInt(8, 25)
  const listings: Omit<Listing, 'id' | 'createdAt'>[] = []

  for (let i = 0; i < n; i++) {
    const itemId = generateItemId()
    const title = randomChoice(MOCK_TITLES)
    const seller = randomChoice(MOCK_SELLERS)
    const price = randomFloat(5, 2500)
    const shipping = Math.random() > 0.4 ? 0 : randomFloat(3.99, 29.99)
    const condition = randomChoice(CONDITIONS)
    const returnsAccepted = Math.random() > 0.3
    const bestOffer = Math.random() > 0.5
    const postedAt = generatePostedAt()

    // Filter based on search params
    if (params.priceMin && price < params.priceMin) continue
    if (params.priceMax && price > params.priceMax) continue
    if (params.freeShippingOnly && shipping > 0) continue
    if (params.condition && params.condition !== 'Any' && condition !== params.condition) continue

    const images = PLACEHOLDER_IMAGES.map(url => url.replace('{id}', itemId))

    listings.push({
      itemId,
      monitorId: null,
      title: params.keywords
        ? title.includes(params.keywords.split(' ')[0])
          ? title
          : `${title} - ${params.keywords}`
        : title,
      url: `https://www.ebay.com/itm/${itemId}`,
      price,
      shipping,
      total: Math.round((price + shipping) * 100) / 100,
      condition,
      sellerName: seller.name,
      sellerFeedback: seller.feedback,
      returnsAccepted,
      bestOffer,
      postedAt,
      foundAt: new Date().toISOString(),
      images,
      itemSpecifics: {
        Brand: title.split(' ')[0],
        Model: title.split(' ').slice(1, 3).join(' '),
        Condition: condition,
        ...(Math.random() > 0.5 ? { Color: randomChoice(['Black', 'Silver', 'White', 'Gray', 'Blue']) } : {}),
        ...(Math.random() > 0.5 ? { 'Country/Region of Manufacture': 'United States' } : {})
      },
      rawJson: '{}'
    })
  }

  // Sort by params
  if (params.sortBy === 'PriceLow') {
    listings.sort((a, b) => a.total - b.total)
  } else if (params.sortBy === 'PriceHigh') {
    listings.sort((a, b) => b.total - a.total)
  } else {
    // Default: NewlyListed
    listings.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime())
  }

  return listings.slice(0, params.limit || 50)
}

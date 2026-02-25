import { z } from 'zod'

export const MonitorSchema = z.object({
  id: z.number(),
  enabled: z.boolean(),
  group: z.string().default('Default'),
  keywords: z.array(z.string()),
  searchInDesc: z.boolean().default(false),
  priceMin: z.number().nullable().default(null),
  priceMax: z.number().nullable().default(null),
  condition: z.string().default('Any'),
  format: z.enum(['BuyItNow', 'Auction', 'All']).default('BuyItNow'),
  freeShippingOnly: z.boolean().default(false),
  excludeKeywords: z.array(z.string()).default([]),
  sellerMinFeedback: z.number().default(0),
  usOnly: z.boolean().default(true),
  totalPriceMode: z.boolean().default(false),
  allowSellers: z.array(z.string()).default([]),
  denySellers: z.array(z.string()).default([]),
  intervalSec: z.number().min(10).default(60),
  viewType: z.enum(['Results', 'AuctionEnding']).default('Results'),
  site: z.string().default('EBAY-US'),
  locatedIn: z.string().default(''),
  shipsTo: z.string().default(''),
  categoryId: z.string().default(''),
  categoryPath: z.string().default(''),
  includeSubcategories: z.boolean().default(false),
  viewId: z.string().default(''),
  status: z.enum(['OK', 'RateLimited', 'AuthError', 'Error', 'Idle']).default('Idle'),
  lastCheckAt: z.string().nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string()
})

export const MonitorCreateSchema = MonitorSchema.omit({
  id: true,
  status: true,
  lastCheckAt: true,
  createdAt: true,
  updatedAt: true
})

export const MonitorUpdateSchema = MonitorCreateSchema.partial().extend({
  id: z.number()
})

export const ListingSchema = z.object({
  id: z.number(),
  itemId: z.string(),
  monitorId: z.number().nullable(),
  title: z.string(),
  url: z.string(),
  price: z.number(),
  shipping: z.number(),
  total: z.number(),
  condition: z.string(),
  sellerName: z.string(),
  sellerFeedback: z.number(),
  returnsAccepted: z.boolean(),
  bestOffer: z.boolean(),
  postedAt: z.string(),
  foundAt: z.string(),
  images: z.array(z.string()),
  itemSpecifics: z.record(z.string()),
  rawJson: z.string(),
  dismissedAt: z.string().nullable().default(null),
  createdAt: z.string()
})

export const SearchParamsSchema = z.object({
  keywords: z.string().min(1),
  searchInDesc: z.boolean().optional(),
  priceMin: z.number().nullable().optional(),
  priceMax: z.number().nullable().optional(),
  condition: z.string().optional(),
  format: z.enum(['BuyItNow', 'Auction', 'All']).optional(),
  freeShippingOnly: z.boolean().optional(),
  excludeKeywords: z.array(z.string()).optional(),
  sellerMinFeedback: z.number().optional(),
  usOnly: z.boolean().optional(),
  totalPriceMode: z.boolean().optional(),
  categoryId: z.string().optional(),
  sortBy: z.enum(['NewlyListed', 'PriceLow', 'PriceHigh', 'EndingSoon', 'BestMatch']).optional(),
  page: z.number().optional(),
  limit: z.number().optional()
})

export const EbayCredentialsSchema = z.object({
  appId: z.string(),
  certId: z.string(),
  devId: z.string(),
  oauthToken: z.string(),
  environment: z.enum(['SANDBOX', 'PRODUCTION']),
  siteId: z.string()
})

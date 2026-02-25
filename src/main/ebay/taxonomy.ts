import { getCredentials, isMockMode } from './client'
import { addLog, upsertCategories, saveCategoryTree, getCategoryCount } from '../db/database'
import type { EbayCategory } from '@shared/types'
import fs from 'fs'
import path from 'path'

// ============================================================
// eBay Taxonomy API - Category Tree Fetcher
// ============================================================

interface TaxonomyCategory {
  category: {
    categoryId: string
    categoryName: string
  }
  categoryTreeNodeLevel: number
  parentCategoryTreeNodeHref?: string
  leafCategoryTreeNode?: boolean
  childCategoryTreeNodes?: TaxonomyCategory[]
}

interface CategoryTreeResponse {
  categoryTreeId: string
  categoryTreeVersion: string
  rootCategoryNode: TaxonomyCategory
}

function flattenCategories(
  node: TaxonomyCategory,
  parentId: string,
  pathParts: string[],
  marketplace: string,
  result: EbayCategory[]
): void {
  const catId = node.category.categoryId
  const catName = node.category.categoryName
  const currentPath = [...pathParts, catName]

  result.push({
    categoryId: catId,
    parentId,
    name: catName,
    path: currentPath.join(' > '),
    isLeaf: !!node.leafCategoryTreeNode,
    marketplace
  })

  if (node.childCategoryTreeNodes) {
    for (const child of node.childCategoryTreeNodes) {
      flattenCategories(child, catId, currentPath, marketplace, result)
    }
  }
}

export async function fetchAndStoreCategoryTree(): Promise<{ success: boolean; count: number; message: string }> {
  const creds = getCredentials()

  if (isMockMode() || !creds) {
    return { success: false, count: 0, message: 'Cannot fetch categories: no eBay credentials configured. Using bundled snapshot.' }
  }

  try {
    // Get OAuth token
    let token: string
    if (creds.oauthToken) {
      token = creds.oauthToken
    } else if (creds.appId && creds.certId) {
      const tokenUrl = creds.environment === 'PRODUCTION'
        ? 'https://api.ebay.com/identity/v1/oauth2/token'
        : 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'

      const authString = Buffer.from(`${creds.appId}:${creds.certId}`).toString('base64')
      const tokenResp = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authString}`
        },
        body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope'
      })

      if (!tokenResp.ok) {
        throw new Error(`OAuth token failed: ${tokenResp.status}`)
      }

      const tokenData = await tokenResp.json() as { access_token: string }
      token = tokenData.access_token
    } else {
      return { success: false, count: 0, message: 'No valid credentials for Taxonomy API' }
    }

    // Fetch category tree for EBAY_US (tree ID 0)
    const baseUrl = creds.environment === 'PRODUCTION'
      ? 'https://api.ebay.com/commerce/taxonomy/v1/category_tree/0'
      : 'https://api.sandbox.ebay.com/commerce/taxonomy/v1/category_tree/0'

    addLog('info', 'Fetching eBay US category tree from Taxonomy API...')

    const resp = await fetch(baseUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!resp.ok) {
      const body = await resp.text()
      throw new Error(`Taxonomy API error ${resp.status}: ${body.slice(0, 200)}`)
    }

    const data = await resp.json() as CategoryTreeResponse
    const categories: EbayCategory[] = []

    flattenCategories(data.rootCategoryNode, '', [], 'EBAY_US', categories)

    // Store in DB
    saveCategoryTree(data.categoryTreeId, 'EBAY_US', data.categoryTreeVersion, '')
    upsertCategories(categories)

    addLog('info', `Fetched ${categories.length} categories from Taxonomy API`)
    return { success: true, count: categories.length, message: `Loaded ${categories.length} categories from eBay` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    addLog('error', `Failed to fetch category tree: ${message}`)
    return { success: false, count: 0, message: `Failed to fetch categories: ${message}` }
  }
}

export function loadBundledCategories(): number {
  try {
    // Try multiple possible locations for the bundled categories file
    const possiblePaths = [
      path.join(__dirname, '../../resources/categories-ebay-us.json'),
      path.join(__dirname, '../../../resources/categories-ebay-us.json'),
      path.join(process.resourcesPath || '', 'categories-ebay-us.json')
    ]

    let jsonData: string | null = null
    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          jsonData = fs.readFileSync(p, 'utf-8')
          break
        }
      } catch {
        // try next
      }
    }

    if (!jsonData) {
      addLog('warn', 'No bundled categories file found')
      return 0
    }

    const categories = JSON.parse(jsonData) as EbayCategory[]
    upsertCategories(categories)
    addLog('info', `Loaded ${categories.length} categories from bundled snapshot`)
    return categories.length
  } catch (err) {
    addLog('error', `Failed to load bundled categories: ${err}`)
    return 0
  }
}

export function ensureCategoriesLoaded(): void {
  const count = getCategoryCount()
  if (count === 0) {
    loadBundledCategories()
  }
}

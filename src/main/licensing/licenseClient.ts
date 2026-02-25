import type {
  TrialStartRequest, TrialStartResponse,
  ActivateRequest, ActivateResponse,
  ValidateRequest, ValidateResponse,
  DeactivateRequest, DeactivateResponse
} from '@shared/licensingTypes'

const LICENSE_SERVER_URL = process.env.LICENSE_SERVER_URL || 'https://api.example.com/v1'
const REQUEST_TIMEOUT_MS = 15000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 2000

class LicenseClientError extends Error {
  constructor(
    message: string,
    public statusCode: number = 0,
    public serverMessage?: string
  ) {
    super(message)
    this.name = 'LicenseClientError'
  }
}

async function fetchWithRetry<T>(
  url: string,
  body: unknown,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let serverMsg: string | undefined
        try {
          const parsed = JSON.parse(text)
          serverMsg = parsed.error || parsed.message
        } catch {
          serverMsg = text || undefined
        }
        throw new LicenseClientError(
          `HTTP ${res.status}: ${serverMsg || res.statusText}`,
          res.status,
          serverMsg
        )
      }

      return (await res.json()) as T
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      // Don't retry on client errors (4xx) — only on network/server errors
      if (err instanceof LicenseClientError && err.statusCode >= 400 && err.statusCode < 500) {
        throw err
      }

      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }

  throw lastError || new Error('Request failed')
}

export async function startTrial(req: TrialStartRequest): Promise<TrialStartResponse> {
  return fetchWithRetry<TrialStartResponse>(
    `${LICENSE_SERVER_URL}/trial/start`,
    req
  )
}

export async function activateLicense(req: ActivateRequest): Promise<ActivateResponse> {
  return fetchWithRetry<ActivateResponse>(
    `${LICENSE_SERVER_URL}/license/activate`,
    req
  )
}

export async function validateLicense(req: ValidateRequest): Promise<ValidateResponse> {
  return fetchWithRetry<ValidateResponse>(
    `${LICENSE_SERVER_URL}/license/validate`,
    req
  )
}

export async function deactivateLicense(req: DeactivateRequest): Promise<DeactivateResponse> {
  return fetchWithRetry<DeactivateResponse>(
    `${LICENSE_SERVER_URL}/license/deactivate`,
    req
  )
}

export { LicenseClientError }

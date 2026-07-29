import { defaultEnvironment, environments } from './environment'
import type { Environment } from './environment'
import {
  clearRefreshToken,
  getAccessToken,
  readEnvironment,
  readRefreshToken,
  saveRefreshToken,
  saveEnvironment,
  setAccessToken,
} from './session'

let environment: Environment = readEnvironment() ?? defaultEnvironment
let generation = 0
const refreshFlights = new Map<number, Promise<void>>()

type AuthTokens = { accessToken: string; refreshToken: string }

export type Mission = {
  missionId: number
  missionImageUrl: string
  type: string
  title: string | null
  detail: string | null
  decisionCondition: string | null
  createdAt: string
}

export function getEnvironment() {
  return environment
}

class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function errorFor(response: Response) {
  return response.json().catch(() => null).then((body) =>
    new HttpError(response.status, body?.message ?? '요청을 처리하지 못했습니다.'),
  )
}

async function fetchJson<T>(
  path: string,
  init: RequestInit,
  targetEnvironment: Environment,
  token: string | null,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${environments[targetEnvironment].apiBaseUrl}${path}`, {
    ...init,
    headers,
    credentials: 'omit',
  })
  if (!response.ok) throw await errorFor(response)
  return response.status === 204 || response.headers.get('content-length') === '0'
    ? (undefined as T)
    : response.json() as Promise<T>
}

async function refresh(targetEnvironment: Environment, targetGeneration: number) {
  const existingFlight = refreshFlights.get(targetGeneration)
  if (existingFlight) return existingFlight
  const flight = (async () => {
    const refreshToken = readRefreshToken(targetEnvironment)
    if (!refreshToken) throw new Error('로그인이 필요합니다.')
    const tokens = await fetchJson<AuthTokens>(
      '/auth/reissue',
      { method: 'POST', body: JSON.stringify({ refreshToken }) },
      targetEnvironment,
      null,
    )
    if (!tokens.accessToken || !tokens.refreshToken) throw new Error('토큰 재발급 응답이 올바르지 않습니다.')
    if (environment !== targetEnvironment || generation !== targetGeneration) {
      throw new Error('환경이 변경되어 이전 인증 응답을 무시했습니다.')
    }
    setAccessToken(tokens.accessToken)
    saveRefreshToken(targetEnvironment, tokens.refreshToken)
  })().finally(() => { refreshFlights.delete(targetGeneration) })
  refreshFlights.set(targetGeneration, flight)
  return flight
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const targetEnvironment = environment
  const targetGeneration = generation
  try {
    return await fetchJson<T>(path, init, targetEnvironment, getAccessToken())
  } catch (cause) {
    if (!(cause instanceof HttpError) || cause.status !== 401 || !retry || environment !== targetEnvironment || generation !== targetGeneration) throw cause
    try {
      await refresh(targetEnvironment, targetGeneration)
    } catch (refreshCause) {
      if (environment === targetEnvironment && generation === targetGeneration) {
        setAccessToken(null)
        clearRefreshToken(targetEnvironment)
      }
      throw refreshCause
    }
    return request<T>(path, init, false)
  }
}

export async function loginWithEnvironmentFallback(email: string, password: string) {
  const targetGeneration = generation

  for (const targetEnvironment of ['prod', 'dev'] as const) {
    try {
      const tokens = await fetchJson<AuthTokens>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
        targetEnvironment,
        null,
      )
      if (!tokens.accessToken || !tokens.refreshToken) throw new Error('Login response is invalid.')
      if (generation !== targetGeneration) throw new Error('The session changed during login.')

      environment = targetEnvironment
      saveEnvironment(targetEnvironment)
      setAccessToken(tokens.accessToken)
      saveRefreshToken(targetEnvironment, tokens.refreshToken)
      return targetEnvironment
    } catch (cause) {
      if (targetEnvironment === 'prod' && cause instanceof HttpError && cause.status === 401) continue
      throw cause
    }
  }

  throw new Error('Login failed.')
}

export async function login(email: string, password: string) {
  const targetEnvironment = environment
  const targetGeneration = generation
  const tokens = await fetchJson<AuthTokens>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    targetEnvironment,
    null,
  )
  if (!tokens.accessToken || !tokens.refreshToken) throw new Error('로그인 응답이 올바르지 않습니다.')
  if (environment !== targetEnvironment || generation !== targetGeneration) throw new Error('환경이 변경되어 로그인 응답을 무시했습니다.')
  setAccessToken(tokens.accessToken)
  saveRefreshToken(targetEnvironment, tokens.refreshToken)
}

export async function reissue() {
  await refresh(environment, generation)
}

export async function logoutCurrentEnvironment() {
  const targetEnvironment = environment
  const targetGeneration = generation
  const refreshToken = readRefreshToken(targetEnvironment)
  const accessToken = getAccessToken()
  if (refreshToken) {
    try {
      await fetchJson<void>(
        '/auth/logout',
        { method: 'POST', body: JSON.stringify({ refreshToken }) },
        targetEnvironment,
        accessToken,
      )
    } catch (cause) {
      if (cause instanceof HttpError && cause.status === 401) {
        try {
          await refresh(targetEnvironment, targetGeneration)
          const rotatedRefreshToken = readRefreshToken(targetEnvironment)
          if (rotatedRefreshToken) {
            await fetchJson<void>(
              '/auth/logout',
              { method: 'POST', body: JSON.stringify({ refreshToken: rotatedRefreshToken }) },
              targetEnvironment,
              getAccessToken(),
            )
          }
        } catch {
          // Local state is cleared even if the bounded remote retry fails.
        }
      }
      // Local state must still be cleared when the remote session is unavailable.
    }
  }
  if (environment === targetEnvironment && generation === targetGeneration) {
    generation += 1
    setAccessToken(null)
    clearRefreshToken(targetEnvironment)
  }
}

export function getMissions() {
  return request<Mission[]>('/admin/missions')
}

export function createMission(input: Omit<Mission, 'missionId' | 'createdAt'>) {
  return request<void>('/admin/missions', { method: 'POST', body: JSON.stringify(input) })
}

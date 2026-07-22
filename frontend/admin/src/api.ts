const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

let accessToken: string | null = null

export type Mission = {
  missionId: number
  missionImageUrl: string
  type: string
  title: string | null
  detail: string | null
  decisionCondition: string | null
  createdAt: string
}

export function setAccessToken(token: string | null) {
  accessToken = token
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? '요청 처리에 실패했습니다.')
  return response.status === 201 || response.status === 204 || response.headers.get('content-length') === '0'
    ? (undefined as T)
    : response.json() as Promise<T>
}

export async function login(email: string, password: string) {
  const result = await request<{ accessToken: string }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  setAccessToken(result.accessToken)
}

export async function reissue() {
  const result = await request<{ accessToken: string }>('/auth/reissue', { method: 'POST' })
  setAccessToken(result.accessToken)
}

export function getMissions() {
  return request<Mission[]>('/admin/missions')
}

export function createMission(input: Omit<Mission, 'missionId' | 'createdAt'>) {
  return request<void>('/admin/missions', { method: 'POST', body: JSON.stringify(input) })
}

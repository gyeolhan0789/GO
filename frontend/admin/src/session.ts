import type { Environment } from './environment'

let accessToken: string | null = null

function accessTokenKey(environment: Environment) {
  return `wecandoit.admin.accessToken.${environment}`
}

function refreshTokenKey(environment: Environment) {
  return `wecandoit.admin.refreshToken.${environment}`
}

const environmentKey = 'wecandoit.admin.environment'

export function getAccessToken(environment: Environment) {
  return accessToken ?? sessionStorage.getItem(accessTokenKey(environment))
}

export function setAccessToken(environment: Environment, token: string | null) {
  accessToken = token
  if (token) {
    sessionStorage.setItem(accessTokenKey(environment), token)
    return
  }
  sessionStorage.removeItem(accessTokenKey(environment))
}

export function readRefreshToken(environment: Environment) {
  return sessionStorage.getItem(refreshTokenKey(environment))
}

export function saveRefreshToken(environment: Environment, token: string) {
  sessionStorage.setItem(refreshTokenKey(environment), token)
}

export function clearRefreshToken(environment: Environment) {
  sessionStorage.removeItem(refreshTokenKey(environment))
}

export function readEnvironment(): Environment | null {
  const value = sessionStorage.getItem(environmentKey)
  return value === 'prod' || value === 'dev' ? value : null
}

export function saveEnvironment(environment: Environment) {
  sessionStorage.setItem(environmentKey, environment)
}

export type Environment = 'local' | 'prod' | 'dev'

export const environments: Record<Environment, { label: string; apiBaseUrl: string }> = {
  local: { label: 'Local', apiBaseUrl: 'http://127.0.0.1:8080' },
  prod: { label: 'Prod', apiBaseUrl: 'https://i15a506.p.ssafy.io' },
  dev: { label: 'Dev', apiBaseUrl: 'https://i15a506.p.ssafy.io/dev' },
}

export const defaultEnvironment: Environment = 'local'

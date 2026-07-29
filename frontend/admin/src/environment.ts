export type Environment = 'prod' | 'dev'

export const environments: Record<Environment, { label: string; apiBaseUrl: string }> = {
  prod: { label: 'Prod', apiBaseUrl: 'https://i15a506.p.ssafy.io' },
  dev: { label: 'Dev', apiBaseUrl: 'https://i15a506.p.ssafy.io/dev' },
}

export const defaultEnvironment: Environment = 'prod'

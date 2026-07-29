export type Environment = 'local' | 'prod' | 'dev'

const deploymentEnvironment: Extract<Environment, 'prod' | 'dev'> =
  import.meta.env.VITE_API_ENV === 'dev' ? 'dev' : 'prod'
const deploymentApiBaseUrl = import.meta.env.VITE_API_BASE_URL

export const environments: Record<Environment, { label: string; apiBaseUrl: string }> = {
  local: { label: 'Local', apiBaseUrl: 'http://127.0.0.1:8080' },
  prod: {
    label: 'Prod',
    apiBaseUrl: deploymentEnvironment === 'prod' && deploymentApiBaseUrl
      ? deploymentApiBaseUrl
      : 'https://i15a506.p.ssafy.io',
  },
  dev: {
    label: 'Dev',
    apiBaseUrl: deploymentEnvironment === 'dev' && deploymentApiBaseUrl
      ? deploymentApiBaseUrl
      : 'https://i15a506.p.ssafy.io/dev',
  },
}

export const defaultEnvironment: Environment = import.meta.env.DEV
  ? 'local'
  : deploymentEnvironment

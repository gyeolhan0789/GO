import { thresholds, runScenario } from './lib/scenario.js';

// 평상시 기대 트래픽 검증. VUS/DURATION 환경변수로 조정한다.
// smoke 테스트는 별도 파일 없이 `--env VUS=1 --env DURATION=10s`로 대체한다.
export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s',
  thresholds,
};

export default runScenario;

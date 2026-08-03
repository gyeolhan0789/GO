import { thresholds, runScenario } from './lib/scenario.js';

// 순간적인 트래픽 급증에 대한 대응/복구 확인. 5 VU -> 100 VU로 급격히 튀었다가 빠진다.
export const options = {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 5 },
  ],
  thresholds,
};

export default runScenario;

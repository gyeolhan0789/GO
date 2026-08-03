import { thresholds, runScenario } from './lib/scenario.js';

// 어디서 한계가 오는지 점진적으로 확인. 20 -> 50 -> 100 VU로 6분에 걸쳐 램프업 후 종료.
export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds,
};

export default runScenario;

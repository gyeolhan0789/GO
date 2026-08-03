import type { Region } from './regions';

/**
 * 시·도 판정에 쓰는 대표 도시 좌표. GPS 좌표는 가장 가까운 앵커가 속한 시·도로 읽는다.
 *
 * 시·도마다 중심점을 하나만 두면 서울을 감싸는 경기처럼 도넛 모양인 시·도가 통째로
 * 밀려난다 — 고양·부천·성남은 경기 중심점(이천 부근)보다 서울 중심점이 훨씬 가까워
 * 전부 서울로 잡혔다. 그래서 시·군청 단위로 앵커를 흩어 두고, 특히 광역시를 둘러싼
 * 시·군은 촘촘히 넣어 광역시 바깥이 광역시로 빨려 들어가지 않게 한다.
 *
 * 그래도 경계 부근은 이웃 시·도로 잡힐 수 있으니 사용자가 직접 고칠 수 있어야 한다.
 */
export const REGION_ANCHORS: readonly {
  region: Region;
  latitude: number;
  longitude: number;
}[] = [
  // 서울 — 외곽 자치구까지 덮어야 맞닿은 경기 도시 앵커에 끌려가지 않는다.
  { region: 'SEOUL', latitude: 37.5665, longitude: 126.978 },
  { region: 'SEOUL', latitude: 37.5509, longitude: 126.8495 },
  { region: 'SEOUL', latitude: 37.4954, longitude: 126.8874 },
  { region: 'SEOUL', latitude: 37.4784, longitude: 126.9516 },
  { region: 'SEOUL', latitude: 37.4979, longitude: 127.0276 },
  { region: 'SEOUL', latitude: 37.5301, longitude: 127.1238 },
  { region: 'SEOUL', latitude: 37.6542, longitude: 127.0568 },
  { region: 'SEOUL', latitude: 37.6027, longitude: 126.9291 },

  // 인천 — 본토와 떨어진 강화·영종은 따로 잡아 주지 않으면 경기로 넘어간다.
  { region: 'INCHEON', latitude: 37.4563, longitude: 126.7052 },
  { region: 'INCHEON', latitude: 37.4738, longitude: 126.6216 },
  { region: 'INCHEON', latitude: 37.3826, longitude: 126.657 },
  { region: 'INCHEON', latitude: 37.507, longitude: 126.7219 },
  { region: 'INCHEON', latitude: 37.603, longitude: 126.669 },
  { region: 'INCHEON', latitude: 37.493, longitude: 126.523 },
  { region: 'INCHEON', latitude: 37.7473, longitude: 126.4878 },

  // 경기 — 서울·인천을 둘러싼 고리라 시·군을 빠짐없이 넣는다.
  { region: 'GYEONGGI', latitude: 37.2636, longitude: 127.0286 },
  { region: 'GYEONGGI', latitude: 37.42, longitude: 127.1265 },
  { region: 'GYEONGGI', latitude: 37.2411, longitude: 127.1776 },
  { region: 'GYEONGGI', latitude: 37.6584, longitude: 126.832 },
  { region: 'GYEONGGI', latitude: 37.6584, longitude: 126.77 },
  { region: 'GYEONGGI', latitude: 37.7599, longitude: 126.78 },
  { region: 'GYEONGGI', latitude: 37.6152, longitude: 126.7156 },
  { region: 'GYEONGGI', latitude: 37.5035, longitude: 126.766 },
  { region: 'GYEONGGI', latitude: 37.4786, longitude: 126.8646 },
  { region: 'GYEONGGI', latitude: 37.3943, longitude: 126.9568 },
  { region: 'GYEONGGI', latitude: 37.4292, longitude: 126.9877 },
  { region: 'GYEONGGI', latitude: 37.3219, longitude: 126.8309 },
  { region: 'GYEONGGI', latitude: 37.38, longitude: 126.8028 },
  { region: 'GYEONGGI', latitude: 37.1996, longitude: 126.8314 },
  { region: 'GYEONGGI', latitude: 37.1499, longitude: 127.0773 },
  { region: 'GYEONGGI', latitude: 36.9921, longitude: 127.1129 },
  { region: 'GYEONGGI', latitude: 37.008, longitude: 127.2797 },
  { region: 'GYEONGGI', latitude: 37.2721, longitude: 127.435 },
  { region: 'GYEONGGI', latitude: 37.2983, longitude: 127.637 },
  { region: 'GYEONGGI', latitude: 37.4917, longitude: 127.4877 },
  { region: 'GYEONGGI', latitude: 37.4292, longitude: 127.2551 },
  { region: 'GYEONGGI', latitude: 37.5393, longitude: 127.2148 },
  { region: 'GYEONGGI', latitude: 37.5943, longitude: 127.1296 },
  { region: 'GYEONGGI', latitude: 37.636, longitude: 127.2165 },
  { region: 'GYEONGGI', latitude: 37.7381, longitude: 127.0338 },
  { region: 'GYEONGGI', latitude: 37.7853, longitude: 127.0458 },
  { region: 'GYEONGGI', latitude: 37.9036, longitude: 127.0606 },
  { region: 'GYEONGGI', latitude: 37.8949, longitude: 127.2003 },
  { region: 'GYEONGGI', latitude: 37.8315, longitude: 127.5095 },
  { region: 'GYEONGGI', latitude: 38.0966, longitude: 127.0748 },

  // 강원
  { region: 'GANGWON', latitude: 37.8813, longitude: 127.73 },
  { region: 'GANGWON', latitude: 37.3422, longitude: 127.9202 },
  { region: 'GANGWON', latitude: 37.7519, longitude: 128.8761 },
  { region: 'GANGWON', latitude: 38.207, longitude: 128.5918 },
  { region: 'GANGWON', latitude: 37.5247, longitude: 129.1143 },
  { region: 'GANGWON', latitude: 37.1641, longitude: 128.9856 },
  { region: 'GANGWON', latitude: 37.6971, longitude: 127.8888 },
  { region: 'GANGWON', latitude: 37.4917, longitude: 127.985 },
  { region: 'GANGWON', latitude: 37.1836, longitude: 128.4617 },
  { region: 'GANGWON', latitude: 37.3705, longitude: 128.39 },
  { region: 'GANGWON', latitude: 37.3807, longitude: 128.6608 },
  { region: 'GANGWON', latitude: 38.1466, longitude: 127.3134 },
  { region: 'GANGWON', latitude: 38.0697, longitude: 128.1707 },
  { region: 'GANGWON', latitude: 38.3806, longitude: 128.4677 },

  // 충북
  { region: 'CHUNGBUK', latitude: 36.6424, longitude: 127.489 },
  { region: 'CHUNGBUK', latitude: 36.991, longitude: 127.9259 },
  { region: 'CHUNGBUK', latitude: 37.1326, longitude: 128.191 },
  { region: 'CHUNGBUK', latitude: 36.8553, longitude: 127.4356 },
  { region: 'CHUNGBUK', latitude: 36.9403, longitude: 127.6905 },
  { region: 'CHUNGBUK', latitude: 36.8155, longitude: 127.7867 },
  { region: 'CHUNGBUK', latitude: 36.4894, longitude: 127.7294 },
  { region: 'CHUNGBUK', latitude: 36.3064, longitude: 127.5714 },
  { region: 'CHUNGBUK', latitude: 36.175, longitude: 127.7764 },
  { region: 'CHUNGBUK', latitude: 36.9846, longitude: 128.3654 },

  // 충남 — 대전·세종을 서·남쪽에서 감싸고 있어 앵커가 성기면 그쪽으로 넘어간다.
  { region: 'CHUNGNAM', latitude: 36.6011, longitude: 126.6608 },
  { region: 'CHUNGNAM', latitude: 36.8151, longitude: 127.1139 },
  { region: 'CHUNGNAM', latitude: 36.7898, longitude: 127.0018 },
  { region: 'CHUNGNAM', latitude: 36.4465, longitude: 127.119 },
  { region: 'CHUNGNAM', latitude: 36.3333, longitude: 126.6128 },
  { region: 'CHUNGNAM', latitude: 36.7848, longitude: 126.4503 },
  { region: 'CHUNGNAM', latitude: 36.8894, longitude: 126.6459 },
  { region: 'CHUNGNAM', latitude: 36.1873, longitude: 127.0987 },
  { region: 'CHUNGNAM', latitude: 36.2757, longitude: 126.9098 },
  { region: 'CHUNGNAM', latitude: 36.0803, longitude: 126.6917 },
  { region: 'CHUNGNAM', latitude: 36.6809, longitude: 126.8449 },
  { region: 'CHUNGNAM', latitude: 36.7455, longitude: 126.2979 },
  { region: 'CHUNGNAM', latitude: 36.1089, longitude: 127.488 },
  { region: 'CHUNGNAM', latitude: 36.2745, longitude: 127.2486 },

  // 세종
  { region: 'SEJONG', latitude: 36.4801, longitude: 127.289 },
  { region: 'SEJONG', latitude: 36.6009, longitude: 127.2969 },

  // 대전
  { region: 'DAEJEON', latitude: 36.3504, longitude: 127.3845 },
  { region: 'DAEJEON', latitude: 36.4506, longitude: 127.4283 },
  { region: 'DAEJEON', latitude: 36.3116, longitude: 127.4548 },
  { region: 'DAEJEON', latitude: 36.3005, longitude: 127.3355 },
  { region: 'DAEJEON', latitude: 36.38, longitude: 127.32 },

  // 대구 — 군위군은 2023년에 편입돼 본토와 떨어져 있다.
  { region: 'DAEGU', latitude: 35.8714, longitude: 128.6014 },
  { region: 'DAEGU', latitude: 35.83, longitude: 128.532 },
  { region: 'DAEGU', latitude: 35.869, longitude: 128.706 },
  { region: 'DAEGU', latitude: 35.94, longitude: 128.556 },
  { region: 'DAEGU', latitude: 35.696, longitude: 128.443 },
  { region: 'DAEGU', latitude: 36.2428, longitude: 128.5729 },

  // 광주
  { region: 'GWANGJU', latitude: 35.1595, longitude: 126.8526 },
  { region: 'GWANGJU', latitude: 35.1396, longitude: 126.7936 },
  { region: 'GWANGJU', latitude: 35.174, longitude: 126.912 },
  { region: 'GWANGJU', latitude: 35.133, longitude: 126.902 },

  // 부산
  { region: 'BUSAN', latitude: 35.1796, longitude: 129.0756 },
  { region: 'BUSAN', latitude: 35.2122, longitude: 128.98 },
  { region: 'BUSAN', latitude: 35.1046, longitude: 128.9747 },
  { region: 'BUSAN', latitude: 35.1631, longitude: 129.1636 },
  { region: 'BUSAN', latitude: 35.2445, longitude: 129.2223 },
  { region: 'BUSAN', latitude: 35.2428, longitude: 129.0921 },

  // 울산
  { region: 'ULSAN', latitude: 35.5384, longitude: 129.3114 },
  { region: 'ULSAN', latitude: 35.5828, longitude: 129.3614 },
  { region: 'ULSAN', latitude: 35.567, longitude: 129.112 },
  { region: 'ULSAN', latitude: 35.34, longitude: 129.32 },

  // 경남 — 부산·울산을 둘러싼 김해·양산이 있어야 그쪽이 광역시로 넘어가지 않는다.
  { region: 'GYEONGNAM', latitude: 35.228, longitude: 128.6811 },
  { region: 'GYEONGNAM', latitude: 35.18, longitude: 128.1076 },
  { region: 'GYEONGNAM', latitude: 35.2285, longitude: 128.8894 },
  { region: 'GYEONGNAM', latitude: 35.335, longitude: 129.0372 },
  { region: 'GYEONGNAM', latitude: 34.8806, longitude: 128.6211 },
  { region: 'GYEONGNAM', latitude: 34.8544, longitude: 128.4331 },
  { region: 'GYEONGNAM', latitude: 35.0036, longitude: 128.0642 },
  { region: 'GYEONGNAM', latitude: 35.5038, longitude: 128.7469 },
  { region: 'GYEONGNAM', latitude: 35.6867, longitude: 127.9095 },
  { region: 'GYEONGNAM', latitude: 35.5205, longitude: 127.7253 },
  { region: 'GYEONGNAM', latitude: 35.5666, longitude: 128.1658 },
  { region: 'GYEONGNAM', latitude: 35.5445, longitude: 128.4922 },
  { region: 'GYEONGNAM', latitude: 34.8376, longitude: 127.8925 },
  { region: 'GYEONGNAM', latitude: 35.0674, longitude: 127.7514 },

  // 경북 — 대구를 둘러싼 경산·칠곡·고령·청도가 특히 촘촘해야 한다.
  { region: 'GYEONGBUK', latitude: 36.019, longitude: 129.3435 },
  { region: 'GYEONGBUK', latitude: 35.8562, longitude: 129.2247 },
  { region: 'GYEONGBUK', latitude: 36.1195, longitude: 128.3446 },
  { region: 'GYEONGBUK', latitude: 36.5684, longitude: 128.7294 },
  { region: 'GYEONGBUK', latitude: 36.1398, longitude: 128.1136 },
  { region: 'GYEONGBUK', latitude: 36.4109, longitude: 128.159 },
  { region: 'GYEONGBUK', latitude: 36.8056, longitude: 128.624 },
  { region: 'GYEONGBUK', latitude: 36.5866, longitude: 128.1867 },
  { region: 'GYEONGBUK', latitude: 35.8251, longitude: 128.7414 },
  { region: 'GYEONGBUK', latitude: 35.9733, longitude: 128.9386 },
  { region: 'GYEONGBUK', latitude: 35.9955, longitude: 128.4017 },
  { region: 'GYEONGBUK', latitude: 35.9192, longitude: 128.283 },
  { region: 'GYEONGBUK', latitude: 35.7262, longitude: 128.2628 },
  { region: 'GYEONGBUK', latitude: 35.6474, longitude: 128.7341 },
  { region: 'GYEONGBUK', latitude: 36.415, longitude: 129.3656 },
  { region: 'GYEONGBUK', latitude: 36.993, longitude: 129.4005 },
  { region: 'GYEONGBUK', latitude: 37.4845, longitude: 130.9057 },

  // 전북
  { region: 'JEONBUK', latitude: 35.8242, longitude: 127.148 },
  { region: 'JEONBUK', latitude: 35.9483, longitude: 126.9576 },
  { region: 'JEONBUK', latitude: 35.9676, longitude: 126.737 },
  { region: 'JEONBUK', latitude: 35.5699, longitude: 126.856 },
  { region: 'JEONBUK', latitude: 35.4164, longitude: 127.3905 },
  { region: 'JEONBUK', latitude: 35.8034, longitude: 126.8809 },
  { region: 'JEONBUK', latitude: 35.7917, longitude: 127.4249 },
  { region: 'JEONBUK', latitude: 36.0068, longitude: 127.6608 },
  { region: 'JEONBUK', latitude: 35.6474, longitude: 127.5214 },
  { region: 'JEONBUK', latitude: 35.3744, longitude: 127.1376 },
  { region: 'JEONBUK', latitude: 35.4356, longitude: 126.702 },
  { region: 'JEONBUK', latitude: 35.7317, longitude: 126.733 },

  // 전남 — 광주를 둘러싼 담양·화순·장성·나주가 촘촘해야 한다.
  { region: 'JEONNAM', latitude: 34.99, longitude: 126.48 },
  { region: 'JEONNAM', latitude: 34.8118, longitude: 126.3922 },
  { region: 'JEONNAM', latitude: 34.7604, longitude: 127.6622 },
  { region: 'JEONNAM', latitude: 34.9506, longitude: 127.4872 },
  { region: 'JEONNAM', latitude: 34.9407, longitude: 127.6959 },
  { region: 'JEONNAM', latitude: 35.0159, longitude: 126.7108 },
  { region: 'JEONNAM', latitude: 35.3211, longitude: 126.9881 },
  { region: 'JEONNAM', latitude: 35.0645, longitude: 126.9866 },
  { region: 'JEONNAM', latitude: 35.3018, longitude: 126.7847 },
  { region: 'JEONNAM', latitude: 35.2772, longitude: 126.512 },
  { region: 'JEONNAM', latitude: 34.8, longitude: 126.6967 },
  { region: 'JEONNAM', latitude: 34.5734, longitude: 126.599 },
  { region: 'JEONNAM', latitude: 34.7714, longitude: 127.08 },
  { region: 'JEONNAM', latitude: 34.6111, longitude: 127.285 },
  { region: 'JEONNAM', latitude: 34.311, longitude: 126.755 },
  { region: 'JEONNAM', latitude: 34.4868, longitude: 126.2634 },
  { region: 'JEONNAM', latitude: 35.282, longitude: 127.292 },
  { region: 'JEONNAM', latitude: 35.2025, longitude: 127.4632 },

  // 제주
  { region: 'JEJU', latitude: 33.4996, longitude: 126.5312 },
  { region: 'JEJU', latitude: 33.2541, longitude: 126.56 },
  { region: 'JEJU', latitude: 33.4586, longitude: 126.942 },
  { region: 'JEJU', latitude: 33.34, longitude: 126.25 },
];

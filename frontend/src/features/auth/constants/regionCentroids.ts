import type { Region } from './regions';

// 각 시·도의 대표 중심 좌표(위도, 경도). GPS 좌표를 시·도 단위로 근사 변환할 때만
// 쓰므로 행정 경계가 아닌 대략적인 중심점이면 충분하다.
export const REGION_CENTROIDS: readonly {
  region: Region;
  latitude: number;
  longitude: number;
}[] = [
  { region: 'SEOUL', latitude: 37.5665, longitude: 126.978 },
  { region: 'BUSAN', latitude: 35.1796, longitude: 129.0756 },
  { region: 'DAEGU', latitude: 35.8714, longitude: 128.6014 },
  { region: 'INCHEON', latitude: 37.4563, longitude: 126.7052 },
  { region: 'GWANGJU', latitude: 35.1595, longitude: 126.8526 },
  { region: 'DAEJEON', latitude: 36.3504, longitude: 127.3845 },
  { region: 'ULSAN', latitude: 35.5384, longitude: 129.3114 },
  { region: 'SEJONG', latitude: 36.4801, longitude: 127.289 },
  { region: 'GYEONGGI', latitude: 37.4138, longitude: 127.5183 },
  { region: 'GANGWON', latitude: 37.8228, longitude: 128.1555 },
  { region: 'CHUNGBUK', latitude: 36.6357, longitude: 127.4917 },
  { region: 'CHUNGNAM', latitude: 36.5184, longitude: 126.8 },
  { region: 'JEONBUK', latitude: 35.7175, longitude: 127.153 },
  { region: 'JEONNAM', latitude: 34.8161, longitude: 126.463 },
  { region: 'GYEONGBUK', latitude: 36.4919, longitude: 128.8889 },
  { region: 'GYEONGNAM', latitude: 35.4606, longitude: 128.2132 },
  { region: 'JEJU', latitude: 33.4996, longitude: 126.5312 },
];

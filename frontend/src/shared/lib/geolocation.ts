import Geolocation from '@react-native-community/geolocation';

export type Coords = {
  latitude: number;
  longitude: number;
};

/**
 * 현재 위치 좌표를 1회 조회한다. 위치 권한은 호출 전에 확보되어 있어야 한다.
 * 시·도 단위 근사에만 쓰므로 고정밀 모드는 끈다.
 */
export function getCurrentCoords(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => reject(error),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
    );
  });
}

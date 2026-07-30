// react-native-maps는 실제 네이티브 지도 모듈(TurboModule)을 요구해서 Jest
// 환경에서 그대로 불러오면 깨진다. 화면 렌더링 테스트만 필요하므로 View로
// 대체한 가벼운 스텁을 쓴다.
import { forwardRef } from 'react';
import { View } from 'react-native';
import type { ViewProps } from 'react-native';

const MapView = forwardRef<View, ViewProps>((props, ref) => (
  <View ref={ref} {...props} />
));
const Marker = (props: ViewProps) => <View {...props} />;
const Polyline = (props: ViewProps) => <View {...props} />;

export default MapView;
export { Marker, Polyline };
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

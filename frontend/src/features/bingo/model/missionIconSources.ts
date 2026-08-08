/**
 * decisionCondition(metric/target)이나 mission.type 기본값으로 골라 쓰는
 * 미션 아이콘 45개(타겟 40 + 메트릭 5)의 정적 asset map. 원본은 SVG인데
 * 이 프로젝트 Metro엔 .svg를 문자열로 import하는 transformer가 없어서,
 * scripts/generate-onboarding-svg.mjs로 미리 구운 .ts 문자열 모듈을 쓴다
 * (Onboarding/Signup 배경 SVG와 같은 방식). 디자이너가 아이콘을 갈아주면
 * assets/missionIcons/의 .svg를 교체하고 그 스크립트를 다시 돌리면 된다.
 */

import iconBanner from '../assets/missionIcons/banner';
import iconBench from '../assets/missionIcons/bench';
import iconBicycleRack from '../assets/missionIcons/bicycle-rack';
import iconBicycle from '../assets/missionIcons/bicycle';
import iconBollard from '../assets/missionIcons/bollard';
import iconBuildingEntrance from '../assets/missionIcons/building-entrance';
import iconBuilding from '../assets/missionIcons/building';
import iconBusStopSign from '../assets/missionIcons/bus-stop-sign';
import iconBusStop from '../assets/missionIcons/bus-stop';
import iconBus from '../assets/missionIcons/bus';
import iconCar from '../assets/missionIcons/car';
import iconCrosswalk from '../assets/missionIcons/crosswalk';
import iconElectricScooter from '../assets/missionIcons/electric-scooter';
import iconEntranceDoor from '../assets/missionIcons/entrance-door';
import iconFireHydrant from '../assets/missionIcons/fire-hydrant';
import iconFlowerBed from '../assets/missionIcons/flower-bed';
import iconFlower from '../assets/missionIcons/flower';
import iconFlowerpot from '../assets/missionIcons/flowerpot';
import iconInformationSign from '../assets/missionIcons/information-sign';
import iconManholeCover from '../assets/missionIcons/manhole-cover';
import iconMetricAverageSpeed from '../assets/missionIcons/metric-average-speed';
import iconMetricCalories from '../assets/missionIcons/metric-calories';
import iconMetricDistance from '../assets/missionIcons/metric-distance';
import iconMetricSteps from '../assets/missionIcons/metric-steps';
import iconMetricWalkingTime from '../assets/missionIcons/metric-walking-time';
import iconMotorcycle from '../assets/missionIcons/motorcycle';
import iconPark from '../assets/missionIcons/park';
import iconParkingBarrier from '../assets/missionIcons/parking-barrier';
import iconParkingLot from '../assets/missionIcons/parking-lot';
import iconPath from '../assets/missionIcons/path';
import iconPedestrianSignal from '../assets/missionIcons/pedestrian-signal';
import iconPlayground from '../assets/missionIcons/playground';
import iconPole from '../assets/missionIcons/pole';
import iconRestroomSign from '../assets/missionIcons/restroom-sign';
import iconRoad from '../assets/missionIcons/road';
import iconSign from '../assets/missionIcons/sign';
import iconSortingBin from '../assets/missionIcons/sorting-bin';
import iconStairRailing from '../assets/missionIcons/stair-railing';
import iconStairs from '../assets/missionIcons/stairs';
import iconStreetlight from '../assets/missionIcons/streetlight';
import iconTrafficCone from '../assets/missionIcons/traffic-cone';
import iconTrafficLight from '../assets/missionIcons/traffic-light';
import iconTrashCan from '../assets/missionIcons/trash-can';
import iconTree from '../assets/missionIcons/tree';
import iconVendingMachine from '../assets/missionIcons/vending-machine';

export const MISSION_ICON_SOURCES: Record<string, string> = {
  banner: iconBanner,
  bench: iconBench,
  'bicycle-rack': iconBicycleRack,
  bicycle: iconBicycle,
  bollard: iconBollard,
  'building-entrance': iconBuildingEntrance,
  building: iconBuilding,
  'bus-stop-sign': iconBusStopSign,
  'bus-stop': iconBusStop,
  bus: iconBus,
  car: iconCar,
  crosswalk: iconCrosswalk,
  'electric-scooter': iconElectricScooter,
  'entrance-door': iconEntranceDoor,
  'fire-hydrant': iconFireHydrant,
  'flower-bed': iconFlowerBed,
  flower: iconFlower,
  flowerpot: iconFlowerpot,
  'information-sign': iconInformationSign,
  'manhole-cover': iconManholeCover,
  'metric-average-speed': iconMetricAverageSpeed,
  'metric-calories': iconMetricCalories,
  'metric-distance': iconMetricDistance,
  'metric-steps': iconMetricSteps,
  'metric-walking-time': iconMetricWalkingTime,
  motorcycle: iconMotorcycle,
  park: iconPark,
  'parking-barrier': iconParkingBarrier,
  'parking-lot': iconParkingLot,
  path: iconPath,
  'pedestrian-signal': iconPedestrianSignal,
  playground: iconPlayground,
  pole: iconPole,
  'restroom-sign': iconRestroomSign,
  road: iconRoad,
  sign: iconSign,
  'sorting-bin': iconSortingBin,
  'stair-railing': iconStairRailing,
  stairs: iconStairs,
  streetlight: iconStreetlight,
  'traffic-cone': iconTrafficCone,
  'traffic-light': iconTrafficLight,
  'trash-can': iconTrashCan,
  tree: iconTree,
  'vending-machine': iconVendingMachine,
};

import type { WalkDatePreset, WalkFilter, WalkSort } from '../types';

export const WALK_DATE_PRESET_OPTIONS: {
  label: string;
  value: WalkDatePreset;
}[] = [
  { label: '전체 기간', value: 'all' },
  { label: '최근 7일', value: 'last7' },
  { label: '최근 30일', value: 'last30' },
  { label: '이번 달', value: 'thisMonth' },
  { label: '지난 달', value: 'lastMonth' },
];

export const WALK_FILTER_OPTIONS: { label: string; value: WalkFilter }[] = [
  { label: '모든 산책', value: 'all' },
  { label: '혼자 산책', value: 'solo' },
  { label: '함께 산책', value: 'group' },
];

export const WALK_SORT_OPTIONS: { label: string; value: WalkSort }[] = [
  { label: '최신순', value: 'latest' },
  { label: '오래된순', value: 'oldest' },
];

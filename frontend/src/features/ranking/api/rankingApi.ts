import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';
import type { EquippedItem } from '../../member/api/memberApi';

/** 랭킹 한 줄. 순위는 서버가 매겨 내려준다. */
export type RankingItem = {
  rank: number;
  memberId: number;
  nickname: string;
  /** Asia/Seoul 기준 이번 주 월요일부터 오늘까지의 누적 걸음 수. */
  weeklySteps: number;
  /** 기본 캐릭터 이미지가 없을 때 성별로 대신 고른다. */
  gender: Gender;
  /** 성별 기본 캐릭터. 착용 아이템은 이 이미지 위에 겹친다. */
  defaultImageUrl: string | null;
  /** 이 회원이 입고 있는 아이템. */
  equippedItems: EquippedItem[];
};

export type RankingPage = {
  content: RankingItem[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  size: number;
  hasNext: boolean;
};

/** 내 순위는 페이지 밖에 있을 수 있어 목록과 별도로 내려온다. */
type RankingBase = {
  myRank: number;
  myWeeklySteps: number;
  rankings: RankingPage;
};

export type FriendRankingResponse = RankingBase;

/** 지역 랭킹. 로그인 회원의 지역으로 서버가 알아서 좁힌다. */
export type RegionRankingResponse = RankingBase & {
  region: string;
};

export type RankingScope = 'friend' | 'region';

export type GetRankingsParams = {
  page?: number;
  size?: number;
};

export function getFriendRankings({ page = 0, size = 20 }: GetRankingsParams) {
  return apiClient.get<FriendRankingResponse>(
    `/rankings/friends?page=${page}&size=${size}`,
  );
}

export function getRegionRankings({ page = 0, size = 20 }: GetRankingsParams) {
  return apiClient.get<RegionRankingResponse>(
    `/rankings?page=${page}&size=${size}`,
  );
}

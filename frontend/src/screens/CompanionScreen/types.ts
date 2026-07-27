export type WalkRoomMode = 'solo' | 'group';

export type MyWalkRoom = {
  id: string;
  name: string;
  mode: WalkRoomMode;
  bingoCompleted: number;
  bingoTotal: number;
  /** mode가 'group'일 때만 유효. */
  memberCount?: number;
  /** mode가 'group'일 때만 표시. 예: "오늘 오후 8:00 예정", "다음 산책 미정". */
  scheduleLabel?: string;
};

export type Friend = {
  id: string;
  name: string;
  recentSteps: number;
  isActive: boolean;
};

/** 백엔드 MemberRelationshipStatus와 동일. */
export type MemberRelationshipStatus =
  | 'NONE'
  | 'FRIEND'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED';

/**
 * 닉네임 검색 결과 하나. 친구 추가는 닉네임 검색으로만 가능하고,
 * 회원은 별도 이름 없이 닉네임만 가진다(MemberSearchResponse와 동일 형태).
 */
export type SearchableFriend = {
  id: string;
  /** '@' 없이 저장, 표시할 때 붙인다. */
  nickname: string;
  relationshipStatus: MemberRelationshipStatus;
};

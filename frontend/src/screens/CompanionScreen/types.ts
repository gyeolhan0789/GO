import type { MyRoomMemberResponse } from '../../features/room/api/roomApi';

export type WalkRoomMode = 'solo' | 'group';

export type MyWalkRoom = {
  id: string;
  name: string;
  mode: WalkRoomMode;
  bingoCompleted: number;
  bingoTotal: number;
  /** mode가 'group'일 때만 유효. */
  memberCount?: number;
  /** mode가 'group'일 때만 유효. 카드의 겹친 아바타를 그린다. */
  members?: MyRoomMemberResponse[];
  /** mode가 'group'일 때만 표시. 예: "오늘 오후 8:00 예정", "다음 산책 미정". */
  scheduleLabel?: string;
};

import type { MyRoomMemberResponse } from '../../features/room/api/roomApi';

export type WalkRoomMode = 'solo' | 'group';

export type WalkRoomOption = {
  id: string;
  name: string;
  mode: WalkRoomMode;
  bingoCompleted: number;
  bingoTotal: number;
  /** mode가 'group'일 때만 유효. */
  memberCount?: number;
  /** mode가 'group'일 때만 유효. 줄 왼쪽의 겹친 아바타를 그린다. */
  members?: MyRoomMemberResponse[];
};

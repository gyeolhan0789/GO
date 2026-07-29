export type WalkRoomMode = 'solo' | 'group';

export type WalkRoomOption = {
  id: string;
  name: string;
  mode: WalkRoomMode;
  bingoCompleted: number;
  bingoTotal: number;
  /** mode가 'group'일 때만 유효. */
  memberCount?: number;
};

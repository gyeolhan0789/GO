import { apiClient } from '../../../shared/api/client';

export type GameMode = 'SINGLE' | 'COOPERATE' | 'BATTLE';

export type GameRoomStatus =
  | 'CREATED'
  | 'WAITING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED';

export type RoomMemberResponse = {
  memberId: number;
  nickname: string;
  host: boolean;
};

export type RoomDetailResponse = {
  roomId: number;
  mode: GameMode;
  status: GameRoomStatus;
  targetBingoCount: number | null;
  targetStepCount: number | null;
  hostId: number;
  startedAt: string | null;
  members: RoomMemberResponse[];
};

export type CreateRoomRequest = {
  /** 필수, 20자 이하. */
  name: string;
  mode: GameMode;
  boardSize: 3 | 4 | 5;
  /** BATTLE만 허용, 1 이상. SINGLE/COOPERATE에는 보내면 안 된다. */
  targetBingoCount?: number;
  /** SINGLE/COOPERATE는 필수(1 이상), BATTLE에는 보내면 안 된다. */
  targetStepCount?: number;
};

export function createRoom(body: CreateRoomRequest) {
  return apiClient.post<RoomDetailResponse>('/rooms', body);
}

export type RoomInviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELED';

export type RoomInviteResponse = {
  requestId: number;
  status: RoomInviteStatus;
  created: boolean;
};

export function inviteToRoom(roomId: number, inviteeId: number) {
  return apiClient.post<RoomInviteResponse>(`/rooms/${roomId}/requests`, {
    inviteeId,
  });
}

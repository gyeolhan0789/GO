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
  hostId: number;
  startedAt: string | null;
  members: RoomMemberResponse[];
};

export type CreateRoomRequest = {
  name: string;
  mode: GameMode;
  boardSize: 3 | 4 | 5;
  targetBingoCount: number;
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

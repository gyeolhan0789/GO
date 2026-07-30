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
  mode: GameMode;
  boardSize: 3 | 4 | 5;
  targetBingoCount?: number;
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

export type ReceivedRoomInvite = {
  requestId: number;
  roomId: number;
  inviterId: number;
  inviterNickname: string;
  status: RoomInviteStatus;
  createdAt: string;
};

export function getReceivedRoomInvites() {
  return apiClient.get<ReceivedRoomInvite[]>('/rooms/requests/received');
}

export function acceptRoomInvite(roomId: number, requestId: number) {
  return apiClient.patch<void>(
    `/rooms/${roomId}/requests/${requestId}/accept`,
  );
}

export function rejectRoomInvite(roomId: number, requestId: number) {
  return apiClient.patch<void>(
    `/rooms/${roomId}/requests/${requestId}/reject`,
  );
}

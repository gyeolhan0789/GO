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
  completedMissionCount: number;
  joinedAt: string;
  bingoBoardId: number | null;
};

export type RoomDetailResponse = {
  roomId: number;
  name: string;
  mode: GameMode;
  status: GameRoomStatus;
  targetBingoCount: number | null;
  targetStepCount: number | null;
  totalMissionCount: number;
  completedMissionCount: number;
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

export function getRoomDetail(roomId: number) {
  return apiClient.get<RoomDetailResponse>(`/rooms/${roomId}`);
}

export type MyRoomMemberResponse = {
  memberId: number;
  nickname: string;
  host: boolean;
};

export type MyRoomResponse = {
  roomId: number;
  name: string;
  mode: GameMode;
  status: GameRoomStatus;
  targetBingoCount: number | null;
  targetStepCount: number | null;
  totalMissionCount: number;
  completedMissionCount: number;
  hostId: number;
  joinedAt: string;
  members: MyRoomMemberResponse[];
};

export function getMyRooms() {
  return apiClient.get<MyRoomResponse[]>('/rooms');
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

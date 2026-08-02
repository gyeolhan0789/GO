import { apiClient } from '../../../shared/api/client';

export type GameMode = 'SINGLE' | 'COOPERATE' | 'BATTLE';

// 백엔드 RoomStatus(backend/.../game/domain/RoomStatus.java)와 동일하다.
// 회차 진행 상태는 방이 아니라 빙고판 status(BingoBoardStatus)가 갖는다.
export type GameRoomStatus = 'ACTIVE' | 'CLOSED';

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
  /** 필수, 20자 이하. */
  name: string;
  mode: GameMode;
  boardSize: 3 | 4 | 5;
  /** 모드 관계없이 필수, 1 이상. */
  targetBingoCount: number;
  /** SINGLE/COOPERATE는 필수(1 이상), BATTLE에는 보내면 안 된다. */
  targetStepCount?: number;
};

export function createRoom(body: CreateRoomRequest) {
  return apiClient.post<RoomDetailResponse>('/rooms', body);
}

export function getRoomDetail(roomId: number) {
  return apiClient.get<RoomDetailResponse>(`/rooms/${roomId}`);
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

export function getMyRooms(mode?: GameMode) {
  const query = mode ? `?mode=${mode}` : '';
  return apiClient.get<MyRoomResponse[]>(`/rooms${query}`);
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

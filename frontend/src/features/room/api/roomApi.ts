import { apiClient } from '../../../shared/api/client';
import type { Gender } from '../../auth/constants/genders';
import type { EquippedItem } from '../../member/api/memberApi';

export type GameMode = 'SINGLE' | 'COOPERATE' | 'BATTLE';

/** 방 멤버의 아바타 정보. 랭킹 응답과 같은 모양으로 내려온다. */
export type RoomMemberAvatar = {
  gender?: Gender;
  defaultImageUrl?: string | null;
  equippedItems?: EquippedItem[];
};

// 백엔드 RoomStatus(backend/.../game/domain/RoomStatus.java)와 동일하다.
// 회차 진행 상태는 방이 아니라 빙고판 status(BingoBoardStatus)가 갖는다.
export type GameRoomStatus = 'ACTIVE' | 'CLOSED';

export type RoomMemberResponse = RoomMemberAvatar & {
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

export type MyRoomMemberResponse = RoomMemberAvatar & {
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
  /**
   * 대결 초대는 수락하는 순간 서버가 카운트다운을 쏘기 때문에 협동과 수락 절차가
   * 다르다. 지금 서버는 이 값을 안 내려준다 — 백엔드에 추가를 요청해 둔 자리이고,
   * 없으면 협동으로 취급한다(소켓을 기다리지 않고 바로 수락).
   */
  mode?: GameMode;
};

export function getReceivedRoomInvites() {
  return apiClient.get<ReceivedRoomInvite[]>('/rooms/requests/received');
}

export type SentRoomInvite = {
  requestId: number;
  roomId: number;
  inviteeId: number;
  inviteeNickname: string;
  status: RoomInviteStatus;
  createdAt: string;
};

/** 내가 보낸 PENDING 초대 전체를 돌려준다. 방별로 보려면 roomId로 걸러 쓴다. */
export function getSentRoomInvites() {
  return apiClient.get<SentRoomInvite[]>('/rooms/requests/sent');
}

export function cancelRoomInvite(roomId: number, requestId: number) {
  return apiClient.patch<void>(
    `/rooms/${roomId}/requests/${requestId}/cancel`,
  );
}

export function leaveRoom(roomId: number) {
  return apiClient.delete<void>(`/rooms/${roomId}/members/me`);
}

export function deleteRoom(roomId: number) {
  return apiClient.delete<void>(`/rooms/${roomId}`);
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

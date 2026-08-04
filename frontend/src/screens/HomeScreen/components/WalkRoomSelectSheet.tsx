import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { useActiveBingoBoardQuery } from '../../../features/bingo/hooks/useActiveBingoBoardQuery';
import { useMyMemberIdQuery } from '../../../features/member/hooks/useMyMemberIdQuery';
import { useMyRoomsQuery } from '../../../features/room/hooks/useMyRoomsQuery';
import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { Button } from '../../../shared/components/Button/Button';
import { colors } from '../../../shared/constants/colors';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily } from '../../../shared/constants/typography';
import type { WalkRoomOption } from '../types';
import { WalkRoomOptionRow } from './WalkRoomOptionRow';

type WalkRoomSelectSheetProps = {
  visible: boolean;
  onClose: () => void;
  onStart: (room: WalkRoomOption) => void;
  /** 선택한 방이 빙고판 갱신이 필요하고, 내가 그 방의 방장일 때만
   * 호출한다(방장이 아니면 시트 안에서 대기 안내만 하고 끝낸다). */
  onNeedsRenewal: (params: {
    roomId: number;
    targetStepCount: number | null;
    boardSize: number;
  }) => void;
};

export function WalkRoomSelectSheet({
  visible,
  onClose,
  onStart,
  onNeedsRenewal,
}: WalkRoomSelectSheetProps) {
  const roomsQuery = useMyRoomsQuery('COOPERATE');
  const rooms: WalkRoomOption[] = (roomsQuery.data ?? []).map(room => ({
    id: String(room.roomId),
    name: room.name,
    mode: 'group',
    bingoCompleted: room.completedMissionCount,
    bingoTotal: room.totalMissionCount,
    memberCount: room.members.length,
    members: room.members,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 목록이 로드되면(또는 시트를 다시 열면) 첫 번째 방을 기본 선택한다.
  useEffect(() => {
    if (visible && rooms.length > 0) {
      setSelectedId(rooms[0].id);
    }
  }, [visible, roomsQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRoom = rooms.find(room => room.id === selectedId) ?? null;
  const selectedRoomDetail = roomsQuery.data?.find(
    room => String(room.roomId) === selectedId,
  );

  const myMemberIdQuery = useMyMemberIdQuery();
  const isHost = myMemberIdQuery.data === selectedRoomDetail?.hostId;
  const selectedBoardQuery = useActiveBingoBoardQuery(
    selectedRoom ? Number(selectedRoom.id) : null,
  );

  const handleStartPress = () => {
    if (!selectedRoom) {
      return;
    }
    const board = selectedBoardQuery.data;
    // 판을 다 채웠거나 일주일이 지났으면 갱신 대상이다 — renewalRequired만 보면
    // 기간 전에 다 채운 경우를 놓쳐 갱신 없이 그냥 시작돼버린다.
    if (board && (board.completed || board.renewalRequired)) {
      if (isHost) {
        onNeedsRenewal({
          roomId: Number(selectedRoom.id),
          targetStepCount: board.targetStepCount,
          boardSize: board.boardSize,
        });
      } else {
        Alert.alert(
          '아직 시작할 수 없어요',
          '산책방 형성중이에요. 방장이 다음 주 목표를 설정하면 시작할 수 있어요.',
        );
      }
      return;
    }
    onStart(selectedRoom);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="산책방을 선택하세요"
    >
      {roomsQuery.isLoading ? (
        <Text style={styles.statusText}>불러오는 중...</Text>
      ) : roomsQuery.isError ? (
        <Text style={styles.statusText}>산책방 목록을 불러오지 못했어요.</Text>
      ) : rooms.length === 0 ? (
        <Text style={styles.statusText}>
          참여 중인 산책방이 없어요. 동행 탭에서 만들어보세요.
        </Text>
      ) : (
        <View style={styles.list}>
          {rooms.map(room => (
            <WalkRoomOptionRow
              key={room.id}
              option={room}
              selected={room.id === selectedId}
              onPress={() => setSelectedId(room.id)}
            />
          ))}
        </View>
      )}
      <Button
        label="시작하기"
        disabled={!selectedRoom}
        onPress={handleStartPress}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: spacing.md,
  },
  statusText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginVertical: spacing.xl,
  },
});

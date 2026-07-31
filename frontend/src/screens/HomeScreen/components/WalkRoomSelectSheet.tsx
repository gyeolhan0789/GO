import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
};

export function WalkRoomSelectSheet({
  visible,
  onClose,
  onStart,
}: WalkRoomSelectSheetProps) {
  const roomsQuery = useMyRoomsQuery('COOPERATE');
  const rooms: WalkRoomOption[] = (roomsQuery.data ?? []).map(room => ({
    id: String(room.roomId),
    name: room.name,
    mode: 'group',
    bingoCompleted: room.completedMissionCount,
    bingoTotal: room.totalMissionCount,
    memberCount: room.members.length,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 목록이 로드되면(또는 시트를 다시 열면) 첫 번째 방을 기본 선택한다.
  useEffect(() => {
    if (visible && rooms.length > 0) {
      setSelectedId(rooms[0].id);
    }
  }, [visible, roomsQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedRoom = rooms.find(room => room.id === selectedId) ?? null;

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
        onPress={() => selectedRoom && onStart(selectedRoom)}
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

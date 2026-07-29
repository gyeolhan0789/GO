import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '../../../shared/components/BottomSheet/BottomSheet';
import { Button } from '../../../shared/components/Button/Button';
import { spacing } from '../../../shared/constants/spacing';
import type { WalkRoomOption } from '../types';
import { WalkRoomOptionRow } from './WalkRoomOptionRow';

// TODO: 실제 참여 중인 산책방 API 연동 전까지의 임시 목업 데이터.
const MOCK_WALK_ROOMS: WalkRoomOption[] = [
  {
    id: 'solo',
    name: '혼자 걷기',
    mode: 'solo',
    bingoCompleted: 4,
    bingoTotal: 9,
  },
  {
    id: 'weekend-walkers-1',
    name: '주말 산책러들',
    mode: 'group',
    bingoCompleted: 4,
    bingoTotal: 9,
    memberCount: 4,
  },
  {
    id: 'weekend-walkers-2',
    name: '주말 산책러들',
    mode: 'group',
    bingoCompleted: 4,
    bingoTotal: 9,
    memberCount: 4,
  },
];

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
  const [selectedId, setSelectedId] = useState(MOCK_WALK_ROOMS[1].id);
  const selectedRoom =
    MOCK_WALK_ROOMS.find(room => room.id === selectedId) ?? MOCK_WALK_ROOMS[0];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="산책방을 선택하세요"
    >
      <View style={styles.list}>
        {MOCK_WALK_ROOMS.map(room => (
          <WalkRoomOptionRow
            key={room.id}
            option={room}
            selected={room.id === selectedId}
            onPress={() => setSelectedId(room.id)}
          />
        ))}
      </View>
      <Button label="시작하기" onPress={() => onStart(selectedRoom)} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    marginBottom: spacing.md,
  },
});

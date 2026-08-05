import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MemberAvatar } from '../../../features/member/components/MemberAvatar';
import type { RoomDetailResponse } from '../../../features/room/api/roomApi';
import {
  useBattleMatchingSubscription,
  type BattleMatchingEvent,
} from '../../../features/room/hooks/useBattleMatchingSubscription';
import { AppText } from '../../../shared/components/AppText/AppText';
import { Button } from '../../../shared/components/Button/Button';
import { Card } from '../../../shared/components/Card/Card';
import { colors } from '../../../shared/constants/colors';
import { radius } from '../../../shared/constants/radius';
import { spacing } from '../../../shared/constants/spacing';
import { fontFamily, lineHeights } from '../../../shared/constants/typography';

/** 대결은 둘이 다 모여야 시작한다(GameMode.BATTLE의 정원). */
const BATTLE_PARTICIPANT_COUNT = 2;

const COUNTDOWN_TICK_MS = 1_000;

type BattleWaitingRoomProps = {
  room: RoomDetailResponse;
  myMemberId: number | null;
  /** 방장만 시작 전 취소(초대 거두기 + 방 삭제)를 할 수 있다. */
  isHost: boolean;
  /** 시작 전, 방장이 대결을 접을 때. */
  onCancelBattle: () => void;
  /** 시작 후 기권. 서버가 나간 쪽을 패자로 몰수 처리한다. */
  onForfeit: () => void;
  /**
   * 수락한 쪽이 대기방에 오기 전에 받은 카운트다운. 이벤트는 수락 응답과 거의
   * 동시에 도착해서 이 화면의 구독이 놓친다 — 파라미터로 이어받는다.
   */
  initialCountdownSeconds?: number;
  /** 대결이 시작돼 빙고판으로 들어갈 때. */
  onEnterBoard: () => void;
  /** 카운트다운이 시작됐을 때. 방금 들어온 상대가 화면에 보이게 방을 다시 읽는다. */
  onOpponentJoined: () => void;
  /** 활성 빙고판이 이미 있으면 대결은 이미 시작된 것이다. */
  isBoardReady: boolean;
  /** 상대가 초대를 거절했거나 방장이 취소해서 대결이 무산됐을 때. */
  onMatchingCancelled: (event: BattleMatchingEvent) => void;
};

/**
 * 대결 대기방.
 *
 * 상대가 수락하는 순간 서버가 게임을 만들고 양쪽 개인 큐로 카운트다운을 쏜다.
 * 그래서 여기서 할 일은 그 이벤트를 받는 것과, 놓쳤을 때 활성 빙고판 조회로
 * 시작 여부를 되찾는 것 두 가지다.
 *
 * 서버는 3·2·1을 따로 보내지 않는다. countdownSeconds 하나만 오고 세는 건 여기서 한다.
 */
export function BattleWaitingRoom({
  room,
  myMemberId,
  isHost,
  initialCountdownSeconds,
  onEnterBoard,
  onOpponentJoined,
  onCancelBattle,
  onForfeit,
  isBoardReady,
  onMatchingCancelled,
}: BattleWaitingRoomProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    initialCountdownSeconds ?? null,
  );

  // 수락한 쪽은 이 값이 마운트 뒤에 도착한다 — 수락 직후 이 화면으로 먼저
  // 이동하고, 카운트다운 이벤트가 그 다음에 파라미터를 갱신하기 때문이다.
  // 초기값만 읽으면 그 갱신을 놓쳐서 카운트다운 없이 시작 버튼만 남는다.
  // 이미 세는 중이면(이 화면의 구독이 먼저 받은 경우) 다시 시작하지 않는다.
  useEffect(() => {
    if (initialCountdownSeconds == null) {
      return;
    }
    setRemainingSeconds(current =>
      current === null ? initialCountdownSeconds : current,
    );
  }, [initialCountdownSeconds]);

  useBattleMatchingSubscription({
    roomId: room.roomId,
    enabled: true,
    onEvent: event => {
      if (event.type === 'BATTLE_COUNTDOWN_STARTED') {
        // 상대가 방금 수락해 멤버가 됐다. 방을 다시 읽어야 아바타가 보인다.
        onOpponentJoined();
        setRemainingSeconds(current =>
          current === null ? event.countdownSeconds : current,
        );
        return;
      }
      onMatchingCancelled(event);
    },
  });

  // 카운트다운. 0에 닿으면 둘 다 자동으로 판에 들어간다 — 서버는 이벤트를
  // 보내기 전에 게임과 판을 이미 만들어뒀다.
  useEffect(() => {
    if (remainingSeconds === null) {
      return;
    }
    if (remainingSeconds <= 0) {
      onEnterBoard();
      return;
    }

    const timer = setTimeout(
      () => setRemainingSeconds(current => (current ?? 1) - 1),
      COUNTDOWN_TICK_MS,
    );
    return () => clearTimeout(timer);
    // onEnterBoard는 매 렌더 새로 만들어질 수 있어 넣지 않는다. 넣으면 타이머가
    // 매번 다시 걸려 카운트다운이 진행되지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds]);

  const isCountingDown = remainingSeconds !== null && remainingSeconds > 0;
  const opponent = room.members.find(member => member.memberId !== myMemberId);
  const isFull = room.members.length >= BATTLE_PARTICIPANT_COUNT;

  /**
   * 빙고판이 있다는 것만으로는 시작시킬 수 없다. 지난 회차의 판이 남아 있거나
   * 조회가 다른 상태를 물고 있을 수 있어서, 정원이 찬 것도 같이 본다 — 상대가
   * 없는데 대결이 시작되면 혼자 걷다 끝난다.
   */
  const canStart = isFull && isBoardReady;

  return (
    <View style={styles.container}>
      <Card>
        <AppText style={styles.title}>{room.name}</AppText>
        <AppText style={styles.subtitle}>
          {room.targetBingoCount !== null
            ? `${room.targetBingoCount}줄 먼저 완성하면 승리`
            : '먼저 목표에 닿으면 승리'}
        </AppText>

        <View style={styles.versusRow}>
          <Slot
            member={room.members.find(m => m.memberId === myMemberId) ?? null}
            fallbackLabel="나"
          />
          <AppText style={styles.versus}>VS</AppText>
          <Slot member={opponent ?? null} fallbackLabel="대기 중" />
        </View>

        {/* 상대가 지금 접속해 있는지는 알 수 없다 — 서버가 접속 상태를 들고
            있지 않다. 그래서 "들어왔다"가 아니라 우리가 실제로 아는 것(초대를
            수락해 정원이 찼고 빙고판이 만들어졌다)만 말한다. */}
        <AppText style={styles.status}>
          {isCountingDown
            ? `${remainingSeconds}초 후 시작해요`
            : canStart
            ? '빙고판이 준비됐어요. 언제든 시작할 수 있어요.'
            : isFull
            ? '대결을 준비하고 있어요...'
            : '상대가 초대를 수락하기를 기다리고 있어요'}
        </AppText>
      </Card>

      <Button
        label={isCountingDown ? `${remainingSeconds}` : '대결 시작'}
        disabled={!canStart || isCountingDown}
        onPress={onEnterBoard}
      />

      {/* 카운트다운 중에는 접는 문을 숨긴다 — 3초 뒤면 어차피 판이 열린다. */}
      {isCountingDown ? null : isBoardReady ? (
        <Button
          label="기권하기"
          variant="danger"
          onPress={onForfeit}
          accessibilityLabel="기권하기"
        />
      ) : isHost ? (
        <Button
          label="대결 취소"
          variant="secondary"
          onPress={onCancelBattle}
          accessibilityLabel="대결 취소"
        />
      ) : null}
    </View>
  );
}

type SlotProps = {
  member: RoomDetailResponse['members'][number] | null;
  fallbackLabel: string;
};

function Slot({ member, fallbackLabel }: SlotProps) {
  return (
    <View style={styles.slot}>
      <View style={styles.avatarWrap}>
        {member ? (
          <MemberAvatar
            gender={member.gender}
            defaultImageUrl={member.defaultImageUrl}
            equippedItems={member.equippedItems}
            style={styles.avatar}
          />
        ) : (
          <AppText style={styles.emptyMark}>?</AppText>
        )}
      </View>
      <AppText style={styles.slotName} numberOfLines={1}>
        {member?.nickname ?? fallbackLabel}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: lineHeights[18],
    color: colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  slot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.neutralBg,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  emptyMark: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: lineHeights[24],
    color: colors.ink,
    opacity: 0.3,
  },
  slotName: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
  },
  versus: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: lineHeights[14],
    color: colors.ink,
    opacity: 0.4,
    paddingHorizontal: spacing.sm,
  },
  status: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: lineHeights[13],
    color: colors.ink,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});

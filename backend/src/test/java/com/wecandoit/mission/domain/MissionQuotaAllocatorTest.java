package com.wecandoit.mission.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("미션 배분 계산")
class MissionQuotaAllocatorTest {

    private static final int BOARD_CELL_COUNT = 9;

    @Test
    @DisplayName("사진 인증 여부 비율에 비례하도록 최대잔여법으로 칸을 배분한다")
    void allocatesCellsProportionalToPhotoVerifiedRatio() {
        // given
        Map<MissionBucket, Long> availableByBucket = Map.of(
                photoVerified(MissionDifficulty.MEDIUM), 90L,
                nonPhotoVerified(MissionDifficulty.MEDIUM), 10L
        );

        // when
        Map<MissionBucket, Integer> quotas =
                MissionQuotaAllocator.allocate(availableByBucket, BOARD_CELL_COUNT);

        // then
        assertThat(quotas).containsExactlyInAnyOrderEntriesOf(Map.of(
                photoVerified(MissionDifficulty.MEDIUM), 8,
                nonPhotoVerified(MissionDifficulty.MEDIUM), 1
        ));
    }

    @Test
    @DisplayName("난이도 비율에 비례하도록 최대잔여법으로 칸을 배분한다")
    void allocatesCellsProportionalToDifficultyRatio() {
        // given
        Map<MissionBucket, Long> availableByBucket = Map.of(
                photoVerified(MissionDifficulty.LOW), 25L,
                photoVerified(MissionDifficulty.MEDIUM), 50L,
                photoVerified(MissionDifficulty.HIGH), 25L
        );

        // when
        Map<MissionBucket, Integer> quotas =
                MissionQuotaAllocator.allocate(availableByBucket, BOARD_CELL_COUNT);

        // then
        assertThat(quotas).containsExactlyInAnyOrderEntriesOf(Map.of(
                photoVerified(MissionDifficulty.LOW), 2,
                photoVerified(MissionDifficulty.MEDIUM), 5,
                photoVerified(MissionDifficulty.HIGH), 2
        ));
    }

    @Test
    @DisplayName("한 조합의 미션이 부족하면 같은 타입의 다른 난이도로 대체 배분한다")
    void movesShortfallToAnotherDifficultyOfTheSameType() {
        // given
        Map<MissionBucket, Long> availableByBucket = Map.of(
                photoVerified(MissionDifficulty.MEDIUM), 40L,
                photoVerified(MissionDifficulty.HIGH), 20L,
                nonPhotoVerified(MissionDifficulty.MEDIUM), 40L
        );

        // when
        Map<MissionBucket, Integer> quotas =
                MissionQuotaAllocator.allocate(availableByBucket, BOARD_CELL_COUNT);

        // then
        assertThat(quotas).containsExactlyInAnyOrderEntriesOf(Map.of(
                photoVerified(MissionDifficulty.MEDIUM), 4,
                photoVerified(MissionDifficulty.HIGH), 1,
                nonPhotoVerified(MissionDifficulty.MEDIUM), 4
        ));
    }

    @Test
    @DisplayName("전체 미션이 보드 칸 수보다 적으면 존재하는 만큼만 배분한다")
    void allocatesOnlyAvailableCellsWhenPoolIsSmallerThanBoard() {
        // given
        Map<MissionBucket, Long> availableByBucket =
                Map.of(photoVerified(MissionDifficulty.MEDIUM), 5L);

        // when
        Map<MissionBucket, Integer> quotas =
                MissionQuotaAllocator.allocate(availableByBucket, BOARD_CELL_COUNT);

        // then
        assertThat(quotas)
                .containsExactlyInAnyOrderEntriesOf(Map.of(photoVerified(MissionDifficulty.MEDIUM), 5));
    }

    @Test
    @DisplayName("활성 미션이 없으면 아무 칸도 배분하지 않는다")
    void allocatesNothingWhenPoolIsEmpty() {
        // when
        Map<MissionBucket, Integer> quotas = MissionQuotaAllocator.allocate(Map.of(), BOARD_CELL_COUNT);

        // then
        assertThat(quotas).isEmpty();
    }

    private MissionBucket photoVerified(MissionDifficulty difficulty) {
        return new MissionBucket(true, difficulty);
    }

    private MissionBucket nonPhotoVerified(MissionDifficulty difficulty) {
        return new MissionBucket(false, difficulty);
    }
}

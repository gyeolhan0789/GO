package com.wecandoit.mission.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.mission.domain.Mission;
import com.wecandoit.mission.domain.MissionBucket;
import com.wecandoit.mission.domain.MissionQuotaAllocator;
import com.wecandoit.mission.domain.MissionType;
import com.wecandoit.mission.repository.MissionPoolCount;
import com.wecandoit.mission.repository.MissionRepository;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MissionSelectionReadService {

    private final MissionRepository missionRepository;

    /**
     * Selects {@code cellCount} distinct active missions whose photo verification and difficulty
     * composition mirrors the active mission pool as it stands right now. The pool composition is
     * aggregated on every call, so a changed pool immediately changes the composition of new boards.
     *
     * @throws CustomException with {@link ErrorCode#MISSION_POOL_INSUFFICIENT} when the active pool
     *         cannot fill every cell
     */
    public List<Mission> selectBoardMissions(int cellCount) {
        Map<MissionBucket, Integer> quotas =
                MissionQuotaAllocator.allocate(availableByBucket(), cellCount);
        List<Mission> missions = new ArrayList<>(cellCount);
        quotas.forEach((bucket, quota) -> missions.addAll(missionRepository.findRandomActiveMissions(
                MissionType.namesByPhotoVerified(bucket.photoVerified()),
                bucket.difficulty().name(),
                quota
        )));
        if (missions.size() < cellCount) {
            throw new CustomException(ErrorCode.MISSION_POOL_INSUFFICIENT);
        }
        Collections.shuffle(missions);
        return missions;
    }

    private Map<MissionBucket, Long> availableByBucket() {
        return missionRepository.countActiveMissionsByTypeAndDifficulty().stream()
                .collect(Collectors.groupingBy(
                        poolCount -> MissionBucket.of(poolCount.type(), poolCount.difficulty()),
                        Collectors.summingLong(MissionPoolCount::count)
                ));
    }
}

package com.wecandoit.point.repository;

import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Long> {

    List<PointHistory> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId);

    List<PointHistory> findAllByMemberIdAndRoomIdAndTypeInAndCreatedAtBetween(
            Long memberId,
            Long roomId,
            Collection<PointHistoryType> types,
            LocalDateTime startedAt,
            LocalDateTime endedAt
    );

    boolean existsByMemberIdAndTypeAndReferenceId(Long memberId, PointHistoryType type, Long referenceId);

    boolean existsByTypeAndReferenceId(PointHistoryType type, Long referenceId);
}

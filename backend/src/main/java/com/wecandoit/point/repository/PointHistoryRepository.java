package com.wecandoit.point.repository;

import com.wecandoit.point.domain.PointHistory;
import com.wecandoit.point.domain.PointHistoryType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Long> {

    List<PointHistory> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId);

    boolean existsByMemberIdAndTypeAndReferenceId(Long memberId, PointHistoryType type, Long referenceId);

    boolean existsByTypeAndReferenceId(PointHistoryType type, Long referenceId);
}

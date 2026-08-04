package com.wecandoit.history.repository;

import com.wecandoit.history.domain.WalkSessionBingoAchievement;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalkSessionBingoAchievementRepository
        extends JpaRepository<WalkSessionBingoAchievement, Long> {

    List<WalkSessionBingoAchievement> findAllByWalkSessionId(Long walkSessionId);

    List<WalkSessionBingoAchievement> findAllByWalkSessionIdIn(Collection<Long> walkSessionIds);

    long countByWalkSessionId(Long walkSessionId);
}

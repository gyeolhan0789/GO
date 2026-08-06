package com.wecandoit.mission.repository;

import com.wecandoit.mission.domain.Mission;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MissionRepository extends JpaRepository<Mission, Long> {

    @Query("SELECT new com.wecandoit.mission.repository.MissionPoolCount(m.type, m.difficulty, COUNT(m)) "
            + "FROM Mission m WHERE m.isActive = true GROUP BY m.type, m.difficulty")
    List<MissionPoolCount> countActiveMissionsByTypeAndDifficulty();

    @Query(value = "SELECT * FROM missions WHERE is_active = true AND type IN (:typeNames) "
            + "AND difficulty = :difficultyName ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Mission> findRandomActiveMissions(
            @Param("typeNames") Collection<String> typeNames,
            @Param("difficultyName") String difficultyName,
            @Param("count") int count
    );
}

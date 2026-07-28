package com.wecandoit.mission.repository;

import com.wecandoit.mission.domain.Mission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MissionRepository extends JpaRepository<Mission, Long> {

    @Query(value = "SELECT * FROM missions ORDER BY RAND() LIMIT :count", nativeQuery = true)
    List<Mission> findRandomMissions(@Param("count") int count);
}

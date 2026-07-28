package com.wecandoit.admin.mission.repository;

import com.wecandoit.mission.domain.Mission;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminMissionRepository extends JpaRepository<Mission, Long> {

    List<Mission> findAllByOrderByCreatedAtDescIdDesc();
}

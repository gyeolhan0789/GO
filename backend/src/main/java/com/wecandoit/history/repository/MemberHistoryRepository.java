package com.wecandoit.history.repository;

import com.wecandoit.history.domain.MemberHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberHistoryRepository extends JpaRepository<MemberHistory, Long> {
}

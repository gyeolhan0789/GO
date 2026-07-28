package com.wecandoit.cash.repository;

import com.wecandoit.cash.domain.CashHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CashHistoryRepository extends JpaRepository<CashHistory, Long> {

    List<CashHistory> findAllByMemberIdOrderByCreatedAtDescIdDesc(Long memberId);
}

package com.wecandoit.game.result.repository;

import com.wecandoit.game.result.domain.GameResult;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {
}

package com.wecandoit.bingo.repository;

import com.wecandoit.bingo.domain.BingoBoard;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BingoBoardRepository extends JpaRepository<BingoBoard, Long> {

    boolean existsByRoomId(Long roomId);
}

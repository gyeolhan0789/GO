package com.wecandoit.game.repository;

import com.wecandoit.game.domain.GameResultParticipant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameResultParticipantRepository extends JpaRepository<GameResultParticipant, Long> {

    List<GameResultParticipant> findAllByGameIdOrderByIdAsc(Long gameId);

    Optional<GameResultParticipant> findByGameIdAndMemberId(Long gameId, Long memberId);

    List<GameResultParticipant> findAllByGameIdInOrderByIdAsc(List<Long> gameIds);
}

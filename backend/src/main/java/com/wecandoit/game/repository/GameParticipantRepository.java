package com.wecandoit.game.repository;

import com.wecandoit.game.domain.GameParticipant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, Long> {

    boolean existsByGameIdAndMemberId(Long gameId, Long memberId);

    boolean existsByGameIdInAndMemberId(Collection<Long> gameIds, Long memberId);

    Optional<GameParticipant> findByGameIdAndMemberId(Long gameId, Long memberId);

    List<GameParticipant> findAllByGameIdOrderByJoinedAtAsc(Long gameId);

    List<GameParticipant> findAllByGameIdInOrderByJoinedAtAsc(List<Long> gameIds);
}

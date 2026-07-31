package com.wecandoit.game.repository;

import com.wecandoit.game.domain.GameResult;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {

    Optional<GameResult> findFirstByRoomIdOrderByCreatedAtDescIdDesc(Long roomId);

    boolean existsByGameId(Long gameId);

    Slice<GameResult> findByRoomIdInOrderByCreatedAtDesc(List<Long> roomIds, Pageable pageable);

    @Query("""
            select gr
            from GameResult gr
            where exists (
                select grp.id
                from GameResultParticipant grp
                where grp.gameId = gr.gameId
                  and grp.memberId = :memberId
            )
            order by gr.createdAt desc, gr.id desc
            """)
    Slice<GameResult> findAllByParticipantMemberIdOrderByCreatedAtDescIdDesc(
            @Param("memberId") Long memberId,
            Pageable pageable
    );
}

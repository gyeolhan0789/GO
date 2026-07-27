package com.wecandoit.member.repository;

import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Member;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByEmail(String email);

    Optional<Member> findByEmailAndProvider(String email, AuthProvider provider);

    boolean existsByEmail(String email);

    boolean existsByNickname(String nickname);

    List<Member> findByNicknameContainingIgnoreCaseAndIdNot(String keyword, Long memberId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select m from Member m where m.id = :memberId")
    Optional<Member> findByIdForUpdate(@Param("memberId") Long memberId);
}

package com.wecandoit.member.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.member.domain.Member;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("회원 저장소")
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("닉네임 부분 일치 검색에서 로그인 회원을 제외한다")
    void searchByNicknameExcludesLoginMember() {
        // given
        Member loginMember = memberRepository.save(
                Member.create("login@example.com", "password", "산책회원")
        );
        Member matchingMember = memberRepository.save(
                Member.create("match@example.com", "password", "저녁산책친구")
        );
        memberRepository.save(Member.create("other@example.com", "password", "러닝친구"));

        // when
        Page<Member> members = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                "산책",
                loginMember.getId(),
                PageRequest.of(0, 1)
        );

        // then
        assertThat(members.getContent())
                .extracting(Member::getId)
                .containsExactly(matchingMember.getId());
        assertThat(members.getTotalElements()).isEqualTo(1);
    }
}

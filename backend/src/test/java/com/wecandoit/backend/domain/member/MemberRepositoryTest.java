package com.wecandoit.backend.domain.member;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
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
        List<Member> members = memberRepository.findByNicknameContainingIgnoreCaseAndIdNot(
                "산책",
                loginMember.getId()
        );

        // then
        assertThat(members).extracting(Member::getId).containsExactly(matchingMember.getId());
    }
}

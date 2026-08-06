package com.wecandoit.member.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.common.testcontainers.MySqlDataJpaTest;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;

@MySqlDataJpaTest
@DisplayName("회원 저장소")
class MemberRepositoryTest {

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("닉네임 부분 일치 검색에서 로그인 회원을 제외한다")
    void searchByNicknameExcludesLoginMember() {
        // given
        Member loginMember = memberRepository.save(
                Member.create("login@example.com", "password", "산책회원", null, Gender.MALE)
        );
        Member matchingMember = memberRepository.save(
                Member.create("match@example.com", "password", "저녁산책친구", null, Gender.MALE)
        );
        memberRepository.save(Member.create("other@example.com", "password", "러닝친구", null, Gender.MALE));

        // when
        Slice<Member> members = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                "산책",
                loginMember.getId(),
                PageRequest.of(0, 1)
        );

        // then
        assertThat(members.getContent())
                .extracting(Member::getId)
                .containsExactly(matchingMember.getId());
        assertThat(members.hasNext()).isFalse();
    }

    @Test
    @DisplayName("닉네임 부분 일치를 대소문자와 관계없이 검색하고 이메일만 일치하는 회원은 제외한다")
    void searchByNicknameUsesOnlyNicknameCondition() {
        // given
        Member loginMember = memberRepository.save(
                Member.create("login@example.com", "password", "로그인회원", null, Gender.MALE)
        );
        Member exactMatch = memberRepository.save(
                Member.create("exact@example.com", "password", "walk", null, Gender.MALE)
        );
        Member partialMatch = memberRepository.save(
                Member.create("partial@example.com", "password", "MyWALKer", null, Gender.MALE)
        );
        memberRepository.save(Member.create("walk@email.com", "password", "러닝회원", null, Gender.MALE));

        // when
        Slice<Member> members = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                        "walk",
                        loginMember.getId(),
                        PageRequest.of(0, 20)
                );

        // then
        assertThat(members.getContent())
                .extracting(Member::getId)
                .containsExactlyInAnyOrder(exactMatch.getId(), partialMatch.getId());
    }

    @Test
    @DisplayName("검색 결과를 닉네임 순서로 안정적으로 Slice 조회한다")
    void searchByNicknameOrdersByNickname() {
        // given
        Member loginMember = memberRepository.save(
                Member.create("login@example.com", "password", "로그인회원", null, Gender.MALE)
        );
        Member firstMember = memberRepository.save(
                Member.create("first@example.com", "password", "walkerA", null, Gender.MALE)
        );
        Member secondMember = memberRepository.save(
                Member.create("second@example.com", "password", "walkerB", null, Gender.MALE)
        );

        // when
        Slice<Member> firstSlice = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                        "walk",
                        loginMember.getId(),
                        PageRequest.of(0, 1)
                );
        Slice<Member> secondSlice = memberRepository
                .findByNicknameContainingIgnoreCaseAndIdNotOrderByNicknameAscIdAsc(
                        "walk",
                        loginMember.getId(),
                        PageRequest.of(1, 1)
                );

        // then
        assertThat(firstSlice.getContent()).extracting(Member::getId)
                .containsExactly(firstMember.getId());
        assertThat(secondSlice.getContent()).extracting(Member::getId)
                .containsExactly(secondMember.getId());
        assertThat(firstSlice.hasNext()).isTrue();
        assertThat(secondSlice.hasNext()).isFalse();
    }
}

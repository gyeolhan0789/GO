package com.wecandoit.friend.repository;

import com.wecandoit.friend.domain.Friend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("친구 관계 저장소")
class FriendRepositoryTest {

    @Autowired
    private FriendRepository friendRepository;

    @Autowired
    private MemberRepository memberRepository;

    @Test
    @DisplayName("회원이 관계의 어느 쪽에 저장되어 있어도 친구 관계를 조회한다")
    void findBetweenFindsBothDirections() {
        // given
        Member firstMember = saveMember("first@example.com", "첫번째");
        Member secondMember = saveMember("second@example.com", "두번째");
        friendRepository.save(Friend.create(firstMember, secondMember));

        // when
        boolean forward = friendRepository.existsBetween(firstMember.getId(), secondMember.getId());
        boolean reverse = friendRepository.existsBetween(secondMember.getId(), firstMember.getId());

        // then
        assertThat(forward).isTrue();
        assertThat(reverse).isTrue();
    }

    @Test
    @DisplayName("로그인 회원이 포함된 모든 관계를 친구 회원과 함께 조회한다")
    void findAllByMemberIdReturnsEveryFriend() {
        // given
        Member loginMember = saveMember("login@example.com", "로그인회원");
        Member firstFriend = saveMember("friend1@example.com", "친구1");
        Member secondFriend = saveMember("friend2@example.com", "친구2");
        friendRepository.saveAll(List.of(
                Friend.create(loginMember, firstFriend),
                Friend.create(loginMember, secondFriend)
        ));

        // when
        Page<Friend> firstPage = friendRepository.findAllByMemberId(
                loginMember.getId(),
                PageRequest.of(0, 1)
        );
        Page<Friend> secondPage = friendRepository.findAllByMemberId(
                loginMember.getId(),
                PageRequest.of(1, 1)
        );

        // then
        assertThat(firstPage.getContent())
                .map(friend -> friend.getFriendOf(loginMember.getId()).getNickname())
                .containsExactly("친구1");
        assertThat(secondPage.getContent())
                .map(friend -> friend.getFriendOf(loginMember.getId()).getNickname())
                .containsExactly("친구2");
        assertThat(firstPage.getTotalElements()).isEqualTo(2);
        assertThat(firstPage.hasNext()).isTrue();
    }

    @Test
    @DisplayName("같은 두 회원의 친구 관계는 저장 방향과 관계없이 중복 저장할 수 없다")
    void uniqueConstraintRejectsDuplicateFriend() {
        // given
        Member firstMember = saveMember("first@example.com", "첫번째");
        Member secondMember = saveMember("second@example.com", "두번째");
        friendRepository.saveAndFlush(Friend.create(firstMember, secondMember));

        // when & then
        assertThatThrownBy(() -> friendRepository.saveAndFlush(
                Friend.create(secondMember, firstMember)
        )).isInstanceOf(DataIntegrityViolationException.class);
    }

    private Member saveMember(String email, String nickname) {
        return memberRepository.save(Member.create(email, "password", nickname));
    }
}

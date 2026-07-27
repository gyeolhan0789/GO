package com.wecandoit.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.dto.MemberProfileUpdateRequest;
import com.wecandoit.member.dto.PasswordChangeRequest;
import com.wecandoit.member.dto.SignupRequest;
import com.wecandoit.member.dto.SignupResponse;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("회원 서비스")
@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    private MemberRepository memberRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    private MemberService memberService;

    @BeforeEach
    void setUp() {
        memberService = new MemberService(memberRepository, passwordEncoder);
    }

    @Test
    @DisplayName("이메일, 닉네임이 중복되지 않으면 회원가입에 성공한다")
    void signupSucceeds() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "닉네임", Region.SEOUL, Gender.FEMALE);
        given(memberRepository.existsByEmail(request.email())).willReturn(false);
        given(memberRepository.existsByNickname(request.nickname())).willReturn(false);
        given(passwordEncoder.encode(request.password())).willReturn("encoded-password");
        given(memberRepository.save(ArgumentMatchers.any(Member.class)))
                .willAnswer(invocation -> invocation.getArgument(0));

        // when
        SignupResponse response = memberService.signup(request);

        // then
        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.nickname()).isEqualTo("닉네임");
        assertThat(response.gender()).isEqualTo(Gender.FEMALE);
    }

    @Test
    @DisplayName("이메일이 중복되면 회원가입에 실패한다")
    void signupRejectsDuplicateEmail() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "닉네임", Region.SEOUL);
        given(memberRepository.existsByEmail(request.email())).willReturn(true);

        // when & then
        assertThatThrownBy(() -> memberService.signup(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_EMAIL);
    }

    @Test
    @DisplayName("닉네임이 중복되면 회원가입에 실패한다")
    void signupRejectsDuplicateNickname() {
        // given
        SignupRequest request = new SignupRequest("user@example.com", "Password123!", "닉네임", Region.SEOUL);
        given(memberRepository.existsByEmail(request.email())).willReturn(false);
        given(memberRepository.existsByNickname(request.nickname())).willReturn(true);

        // when & then
        assertThatThrownBy(() -> memberService.signup(request))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_NICKNAME);
    }

    @Test
    @DisplayName("닉네임만 수정하면 지역은 그대로 유지된다")
    void updateProfileUpdatesNicknameOnly() {
        // given
        Member member = localMember(1L, "기존닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberRepository.existsByNickname("새닉네임")).willReturn(false);

        // when
        memberService.updateProfile(1L, new MemberProfileUpdateRequest("새닉네임", null));

        // then
        assertThat(member.getNickname()).isEqualTo("새닉네임");
        assertThat(member.getRegion()).isEqualTo(Region.SEOUL);
    }

    @Test
    @DisplayName("지역만 수정하면 닉네임은 그대로 유지된다")
    void updateProfileUpdatesRegionOnly() {
        // given
        Member member = localMember(1L, "기존닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        // when
        memberService.updateProfile(1L, new MemberProfileUpdateRequest(null, Region.BUSAN));

        // then
        assertThat(member.getNickname()).isEqualTo("기존닉네임");
        assertThat(member.getRegion()).isEqualTo(Region.BUSAN);
    }

    @Test
    @DisplayName("닉네임과 지역을 함께 수정한다")
    void updateProfileUpdatesBoth() {
        // given
        Member member = localMember(1L, "기존닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberRepository.existsByNickname("새닉네임")).willReturn(false);

        // when
        memberService.updateProfile(1L, new MemberProfileUpdateRequest("새닉네임", Region.BUSAN));

        // then
        assertThat(member.getNickname()).isEqualTo("새닉네임");
        assertThat(member.getRegion()).isEqualTo(Region.BUSAN);
    }

    @Test
    @DisplayName("변경하려는 닉네임이 다른 회원과 중복되면 프로필 수정에 실패한다")
    void updateProfileRejectsDuplicateNickname() {
        // given
        Member member = localMember(1L, "기존닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(memberRepository.existsByNickname("중복닉네임")).willReturn(true);

        // when & then
        assertThatThrownBy(() -> memberService.updateProfile(1L, new MemberProfileUpdateRequest("중복닉네임", null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.DUPLICATE_NICKNAME);
    }

    @Test
    @DisplayName("존재하지 않는 회원의 프로필을 수정하면 실패한다")
    void updateProfileRejectsMissingMember() {
        // given
        given(memberRepository.findById(1L)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> memberService.updateProfile(1L, new MemberProfileUpdateRequest("새닉네임", null)))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.MEMBER_NOT_FOUND);
    }

    @Test
    @DisplayName("현재 비밀번호가 일치하면 새 비밀번호로 변경한다")
    void changePasswordSucceeds() {
        // given
        Member member = localMember(1L, "닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(passwordEncoder.matches("oldPassword1!", member.getPassword())).willReturn(true);
        given(passwordEncoder.encode("newPassword1!")).willReturn("encoded-new-password");

        // when
        memberService.changePassword(1L, new PasswordChangeRequest("oldPassword1!", "newPassword1!"));

        // then
        assertThat(member.getPassword()).isEqualTo("encoded-new-password");
    }

    @Test
    @DisplayName("현재 비밀번호가 일치하지 않으면 비밀번호 변경에 실패한다")
    void changePasswordRejectsWrongCurrentPassword() {
        // given
        Member member = localMember(1L, "닉네임", Region.SEOUL);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));
        given(passwordEncoder.matches("wrongPassword1!", member.getPassword())).willReturn(false);

        // when & then
        assertThatThrownBy(() ->
                memberService.changePassword(1L, new PasswordChangeRequest("wrongPassword1!", "newPassword1!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_PASSWORD);
    }

    @Test
    @DisplayName("소셜 계정 회원이 비밀번호 변경을 시도하면 실패한다")
    void changePasswordRejectsSocialProvider() {
        // given
        Member member = Member.createSocial("social@example.com", "닉네임", AuthProvider.GOOGLE);
        ReflectionTestUtils.setField(member, "id", 1L);
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        // when & then
        assertThatThrownBy(() ->
                memberService.changePassword(1L, new PasswordChangeRequest("oldPassword1!", "newPassword1!")))
                .isInstanceOf(CustomException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_PROVIDER);
    }

    private Member localMember(Long id, String nickname, Region region) {
        Member member = Member.create(nickname + "@example.com", "encoded-old-password", nickname, region);
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}

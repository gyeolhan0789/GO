package com.wecandoit.member.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.controller.request.FcmTokenUpdateRequest;
import com.wecandoit.member.controller.request.MemberProfileUpdateRequest;
import com.wecandoit.member.controller.request.PasswordChangeRequest;
import com.wecandoit.member.controller.request.SignupRequest;
import com.wecandoit.member.controller.response.SignupResponse;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public SignupResponse signup(SignupRequest request) {
        if (memberRepository.existsByEmail(request.email())) {
            throw new CustomException(ErrorCode.DUPLICATE_EMAIL);
        }
        if (memberRepository.existsByNickname(request.nickname())) {
            throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
        }

        String encodedPassword = passwordEncoder.encode(request.password());
        Member member = memberRepository.save(
                Member.create(request.email(), encodedPassword, request.nickname(), request.region(), request.gender())
        );

        return SignupResponse.from(member);
    }

    @Transactional
    public void updateProfile(Long memberId, MemberProfileUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        if (request.nickname() != null && !request.nickname().equals(member.getNickname())) {
            if (memberRepository.existsByNickname(request.nickname())) {
                throw new CustomException(ErrorCode.DUPLICATE_NICKNAME);
            }
            member.changeNickname(request.nickname());
        }

        if (request.region() != null) {
            member.changeRegion(request.region());
        }

        if (request.gender() != null) {
            member.changeGender(request.gender());
        }
    }

    @Transactional
    public void changePassword(Long memberId, PasswordChangeRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        if (member.getProvider() != AuthProvider.LOCAL) {
            throw new CustomException(ErrorCode.INVALID_PROVIDER);
        }
        if (!passwordEncoder.matches(request.currentPassword(), member.getPassword())) {
            throw new CustomException(ErrorCode.INVALID_PASSWORD);
        }

        member.changePassword(passwordEncoder.encode(request.newPassword()));
    }

    @Transactional
    public void updateFcmToken(Long memberId, FcmTokenUpdateRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));

        member.updateFcmToken(request.fcmToken());
    }
}

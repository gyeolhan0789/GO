package com.wecandoit.auth.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthSignupState;
import com.wecandoit.auth.dto.OAuthUserInfo;
import com.wecandoit.auth.dto.OAuthVerifyResponse;
import com.wecandoit.auth.repository.OAuthSignupStateRepository;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OAuthService {

    private final OAuthApiClient oAuthApiClient;
    private final MemberRepository memberRepository;
    private final TokenIssuer tokenIssuer;
    private final OAuthSignupStateRepository oAuthSignupStateRepository;

    @Transactional
    public OAuthVerifyResponse verify(AuthProvider provider, String idToken) {
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(provider, idToken);

        return memberRepository.findByEmail(userInfo.email())
                .map(existing -> loginExistingMember(existing, provider))
                .orElseGet(() -> requireSignup(userInfo, provider));
    }

    @Transactional
    public AuthTokens completeSignup(AuthProvider provider, String signupToken, Gender gender) {
        OAuthSignupState state = oAuthSignupStateRepository.find(signupToken)
                .filter(s -> s.provider() == provider)
                .orElseThrow(() -> new CustomException(ErrorCode.OAUTH_SIGNUP_TOKEN_INVALID));

        if (memberRepository.findByEmail(state.email()).isPresent()) {
            throw new CustomException(ErrorCode.OAUTH_ALREADY_REGISTERED);
        }

        Member member = memberRepository.save(
                Member.createSocial(state.email(), state.nickname(), provider, gender)
        );
        oAuthSignupStateRepository.delete(signupToken);

        return tokenIssuer.issue(member.getId(), member.getRole().name());
    }

    private OAuthVerifyResponse loginExistingMember(Member existing, AuthProvider provider) {
        if (existing.getProvider() != provider) {
            throw new CustomException(ErrorCode.OAUTH_PROVIDER_MISMATCH);
        }
        AuthTokens tokens = tokenIssuer.issue(existing.getId(), existing.getRole().name());
        return OAuthVerifyResponse.login(tokens);
    }

    private OAuthVerifyResponse requireSignup(OAuthUserInfo userInfo, AuthProvider provider) {
        String signupToken = oAuthSignupStateRepository.save(userInfo.email(), provider, userInfo.nickname());
        return OAuthVerifyResponse.signupRequired(signupToken);
    }
}

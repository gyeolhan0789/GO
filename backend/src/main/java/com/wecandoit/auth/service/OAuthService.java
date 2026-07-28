package com.wecandoit.auth.service;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.auth.dto.AuthTokens;
import com.wecandoit.auth.dto.OAuthUserInfo;
import com.wecandoit.member.domain.AuthProvider;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Gender;
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

    @Transactional
    public AuthTokens oauthLogin(AuthProvider provider, String idToken) {
        return oauthLogin(provider, idToken, Gender.MALE);
    }

    @Transactional
    public AuthTokens oauthLogin(AuthProvider provider, String idToken, Gender gender) {
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(provider, idToken);

        Member member = memberRepository.findByEmail(userInfo.email())
                .map(existing -> {
                    if (existing.getProvider() != provider) {
                        throw new CustomException(ErrorCode.OAUTH_PROVIDER_MISMATCH);
                    }
                    return existing;
                })
                .orElseGet(() -> memberRepository.save(
                        Member.createSocial(userInfo.email(), userInfo.nickname(), provider, gender)
                ));

        return tokenIssuer.issue(member.getId(), member.getRole().name());
    }
}

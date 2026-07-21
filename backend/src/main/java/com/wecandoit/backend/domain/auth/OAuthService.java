package com.wecandoit.backend.domain.auth;

import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import com.wecandoit.backend.domain.auth.dto.AuthTokens;
import com.wecandoit.backend.domain.auth.oauth.OAuthApiClient;
import com.wecandoit.backend.domain.auth.oauth.OAuthUserInfo;
import com.wecandoit.backend.domain.member.AuthProvider;
import com.wecandoit.backend.domain.member.Member;
import com.wecandoit.backend.domain.member.MemberRepository;
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
        OAuthUserInfo userInfo = oAuthApiClient.verifyAndExtract(provider, idToken);

        Member member = memberRepository.findByEmail(userInfo.email())
                .map(existing -> {
                    if (existing.getProvider() != provider) {
                        throw new CustomException(ErrorCode.OAUTH_PROVIDER_MISMATCH);
                    }
                    return existing;
                })
                .orElseGet(() -> memberRepository.save(
                        Member.createSocial(userInfo.email(), userInfo.nickname(), provider)
                ));

        return tokenIssuer.issue(member.getId(), member.getRole().name());
    }
}

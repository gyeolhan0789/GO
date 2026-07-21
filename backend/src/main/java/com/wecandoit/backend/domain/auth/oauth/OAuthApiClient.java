package com.wecandoit.backend.domain.auth.oauth;

import com.wecandoit.backend.common.config.OAuthProperties;
import com.wecandoit.backend.common.config.OAuthProperties.ProviderProperties;
import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import com.wecandoit.backend.domain.member.AuthProvider;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.ProtectedHeader;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class OAuthApiClient {

    private final OAuthProperties oAuthProperties;
    private final JwkProvider jwkProvider;

    public OAuthUserInfo verifyAndExtract(AuthProvider provider, String idToken) {
        ProviderProperties props = oAuthProperties.getProvider(provider);

        Claims claims;
        try {
            claims = Jwts.parser()
                    .keyLocator(header -> {
                        String kid = (header instanceof ProtectedHeader ph) ? ph.getKeyId() : null;
                        return jwkProvider.getKey(props.jwkUri(), kid);
                    })
                    .build()
                    .parseSignedClaims(idToken)
                    .getPayload();
        } catch (JwtException e) {
            throw new CustomException(ErrorCode.OAUTH_TOKEN_INVALID);
        }

        Set<String> audiences = claims.getAudience();
        if (audiences == null || !audiences.contains(props.clientId())) {
            throw new CustomException(ErrorCode.OAUTH_TOKEN_INVALID);
        }

        String email = claims.get("email", String.class);
        if (email == null) {
            throw new CustomException(ErrorCode.OAUTH_EMAIL_NOT_PROVIDED);
        }

        // Google: "name" 클레임, Kakao: "nickname" 클레임
        String nickname = claims.get("nickname", String.class);
        if (nickname == null) {
            nickname = claims.get("name", String.class);
        }
        if (nickname == null) {
            nickname = email;
        }

        return new OAuthUserInfo(email, nickname);
    }
}

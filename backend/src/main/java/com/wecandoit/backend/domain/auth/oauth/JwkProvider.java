package com.wecandoit.backend.domain.auth.oauth;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.wecandoit.backend.common.exception.CustomException;
import com.wecandoit.backend.common.exception.ErrorCode;
import java.math.BigInteger;
import java.security.Key;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.List;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class JwkProvider {

    private final RestClient restClient = RestClient.create();

    public Key getKey(String jwkUri, String kid) {
        JwkSet jwkSet;
        try {
            jwkSet = restClient.get().uri(jwkUri).retrieve().body(JwkSet.class);
        } catch (RestClientException e) {
            throw new CustomException(ErrorCode.OAUTH_TOKEN_EXCHANGE_FAILED);
        }
        if (jwkSet == null || jwkSet.keys() == null) {
            throw new CustomException(ErrorCode.OAUTH_TOKEN_EXCHANGE_FAILED);
        }
        return jwkSet.keys().stream()
                .filter(k -> kid == null || kid.equals(k.kid()))
                .findFirst()
                .map(this::toPublicKey)
                .orElseThrow(() -> new CustomException(ErrorCode.OAUTH_TOKEN_INVALID));
    }

    private Key toPublicKey(JwkKey jwkKey) {
        try {
            byte[] n = Base64.getUrlDecoder().decode(jwkKey.n());
            byte[] e = Base64.getUrlDecoder().decode(jwkKey.e());
            RSAPublicKeySpec spec = new RSAPublicKeySpec(new BigInteger(1, n), new BigInteger(1, e));
            return KeyFactory.getInstance("RSA").generatePublic(spec);
        } catch (NoSuchAlgorithmException | InvalidKeySpecException ex) {
            throw new CustomException(ErrorCode.OAUTH_TOKEN_INVALID);
        }
    }

    private record JwkSet(@JsonProperty("keys") List<JwkKey> keys) {
    }

    private record JwkKey(String kid, String kty, String n, String e) {
    }
}

package com.wecandoit.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;

@Slf4j
@RequiredArgsConstructor
public class HttpAccessLoggingFilter extends OncePerRequestFilter {

    private static final String MULTIPART_PREFIX = "multipart/";
    private static final String TRUNCATION_SUFFIX = "...(truncated)";

    // ContentCachingResponseWrapper?먮뒗 ?곹븳 ?앹꽦?먭? ?놁뼱 ?묐떟 ?꾩껜媛 ?숈뿉 ?곸옱?쒕떎.
    // ?뺤쟻 ?먯썝(理쒕? 5MB ?대?吏)怨?API 臾몄꽌??4xx 蹂몃Ц??蹂?媛믪씠 ?놁쑝誘濡?媛먯떥吏 ?딅뒗??
    private static final List<String> UNWRAPPED_RESPONSE_PREFIXES =
            List.of("/uploads/", "/swagger-ui", "/v3/api-docs");

    private final HttpAccessLoggingProperties properties;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !properties.enabled();
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        long startedAtNanos = System.nanoTime();
        HttpServletRequest requestToUse = shouldWrapRequest(request)
                ? new ContentCachingRequestWrapper(request, properties.maxBodyLength())
                : request;
        HttpServletResponse responseToUse = shouldWrapResponse(request)
                ? new ContentCachingResponseWrapper(response)
                : response;

        // CustomExceptionHandler媛 泥섎━?섏? 紐삵븳 ?덉쇅???꾪꽣媛 紐⑤몢 ?由???Tomcat??500?쇰줈 諛붽씔??
        // 洹??쒖젏?먮뒗 ?대? 濡쒓퉭???앸굹 ?덉쑝誘濡?500??湲곕낯媛믪쑝濡??먭퀬 ?뺤긽 醫낅즺 ?쒖뿉留??ㅼ젣 status濡???뒗??
        int status = HttpStatus.INTERNAL_SERVER_ERROR.value();
        try {
            filterChain.doFilter(requestToUse, responseToUse);
            status = responseToUse.getStatus();
        } finally {
            try {
                logAccess(request, requestToUse, responseToUse, status, startedAtNanos);
            } catch (Exception e) {
                log.warn("access log 湲곕줉???ㅽ뙣?덈떎", e);
            }
            // ?묐떟 寃쎈줈?대?濡?濡쒓퉭 try-catch 諛뽰뿉??臾댁“嫄??ㅽ뻾?쒕떎.
            // ?덉뿉 ?먮㈃ 濡쒓퉭 ?덉쇅媛 ?대씪?댁뼵???묐떟 蹂몃Ц???섎씪癒밸뒗??
            if (responseToUse instanceof ContentCachingResponseWrapper wrapper) {
                wrapper.copyBodyToResponse();
            }
        }
    }

    // multipart??蹂몃Ц??罹먯떆?대룄 getContentAsByteArray()媛 鍮꾧퀬 5MB媛 ?숈뿉 以묐났 ?곸옱?섎?濡?媛먯떥吏 ?딅뒗??
    // 洹??몄뿉??maxBodyLength濡??곹븳??嫄몃┛ 罹먯떆瑜??⑥꽌 ?덈떒 湲곕줉怨???蹂댄샇瑜??숈떆??留뚯”?쒕떎.
    private boolean shouldWrapRequest(HttpServletRequest request) {
        String contentType = request.getContentType();
        return contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith(MULTIPART_PREFIX);
    }

    private boolean shouldWrapResponse(HttpServletRequest request) {
        String path = request.getRequestURI();
        return UNWRAPPED_RESPONSE_PREFIXES.stream().noneMatch(path::startsWith);
    }

    private boolean shouldLogBody(int status) {
        return status >= HttpStatus.BAD_REQUEST.value();
    }

    private void logAccess(
            HttpServletRequest request,
            HttpServletRequest requestToUse,
            HttpServletResponse response,
            int status,
            long startedAtNanos
    ) {
        MDC.put(MdcKeys.ROUTE, resolveRoute(request));
        long durationMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startedAtNanos);
        String method = request.getMethod();
        String uri = request.getRequestURI();

        if (!shouldLogBody(status)) {
            log.info("{} {} {} {}ms", method, uri, status, durationMs);
            return;
        }
        log.warn(
                "{} {} {} {}ms headers={} req={} resp={}",
                method,
                uri,
                status,
                durationMs,
                maskedHeaders(request),
                requestBody(requestToUse),
                responseBody(response));
    }

    // 理쒖쇅怨??꾪꽣?먮뒗 HandlerMethod媛 ?놁쑝誘濡?DispatcherServlet???④릿 ?⑦꽩 ?띿꽦???쎈뒗??
    // 401/403? DispatcherServlet???꾨떖?섏? ?딆븘 raw URI濡??대갚?쒕떎.
    private String resolveRoute(HttpServletRequest request) {
        Object bestMatchingPattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        if (bestMatchingPattern == null) {
            return request.getRequestURI();
        }
        return bestMatchingPattern.toString();
    }

    private Map<String, String> maskedHeaders(HttpServletRequest request) {
        Map<String, String> maskedHeaders = new LinkedHashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            maskedHeaders.put(
                    headerName, SensitiveDataMasker.maskHeaderValue(headerName, request.getHeader(headerName)));
        }
        return maskedHeaders;
    }

    // multipart ?붿껌? 媛먯떥吏 ?딆븯?쇰?濡?wrapper媛 ?꾨땲怨? 蹂몃Ц???④린吏 ?딅뒗??
    // ContentCachingRequestWrapper???곸냽諛쏆? getContentLengthLong()???ㅻ쾭?쇱씠?쒗븯吏 ?딆쑝誘濡?
    // 洹?媛믪? 罹먯떆 ?곹븳怨?臾닿??섍쾶 ?ㅼ젣 ?붿껌??Content-Length?? 罹먯떆??諛붿씠???섍? 洹몃낫??
    // ?묒쑝硫??섎┛ 寃껋씠??Content-Length瑜?紐⑤Ⅴ硫?-1?대씪 ?먮떒?섏? ?딅뒗??.
    private String requestBody(HttpServletRequest requestToUse) {
        if (!(requestToUse instanceof ContentCachingRequestWrapper wrapper)) {
            return "";
        }
        byte[] cachedBytes = wrapper.getContentAsByteArray();
        long actualContentLength = wrapper.getContentLengthLong();
        boolean truncated = actualContentLength >= 0 && cachedBytes.length < actualContentLength;
        String masked = SensitiveDataMasker.maskBody(decodeUtf8(cachedBytes));
        if (truncated && !masked.endsWith(TRUNCATION_SUFFIX)) {
            return masked + TRUNCATION_SUFFIX;
        }
        return masked;
    }

    // ?뺤쟻 ?먯썝 寃쎈줈??媛먯떥吏 ?딆븯?쇰?濡?wrapper媛 ?꾨땲怨? 蹂몃Ц???④린吏 ?딅뒗??
    // ?묐떟? byte ?곹븳 ?놁씠 ?꾨웾 罹먯떆?섎?濡?臾몄옄 湲몄씠 ?덈떒?쇰줈 異⑸텇?섎떎.
    private String responseBody(HttpServletResponse response) {
        if (!(response instanceof ContentCachingResponseWrapper wrapper)) {
            return "";
        }
        String masked = SensitiveDataMasker.maskBody(decodeUtf8(wrapper.getContentAsByteArray()));
        if (masked == null || masked.length() <= properties.maxBodyLength()) {
            return masked;
        }
        return masked.substring(0, properties.maxBodyLength()) + TRUNCATION_SUFFIX;
    }

    // 罹먯떆媛 byte ?곹븳?먯꽌 硫덉텛硫?硫?곕컮?댄듃 臾몄옄 以묎컙???섎┫ ???덈떎. new String(bytes, UTF_8)?
    // 洹??먮━瑜?U+FFFD濡?梨꾩슦誘濡? 遺덉셿?꾪븳 留덉?留??쒗?ㅻ? 議곗슜??踰꾨━???붿퐫?붾? ?대떎.
    private static String decodeUtf8(byte[] bytes) {
        try {
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.IGNORE)
                    .onUnmappableCharacter(CodingErrorAction.IGNORE)
                    .decode(ByteBuffer.wrap(bytes))
                    .toString();
        } catch (CharacterCodingException e) {
            // IGNORE ?≪뀡?먯꽌??諛쒖깮?섏? ?딆?留? 諛⑹뼱?곸쑝濡??먮낯 ?붿퐫?⑹쑝濡??대갚?쒕떎.
            return new String(bytes, StandardCharsets.UTF_8);
        }
    }
}

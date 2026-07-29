package com.wecandoit.cash.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.cash.controller.response.CashResponse;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CashReadServiceTest {

    @Mock
    private MemberRepository memberRepository;

    @InjectMocks
    private CashReadService cashReadService;

    @Test
    void returnsMembersCash() {
        Member member = Member.builder()
                .email("cash@example.com")
                .nickname("cash-member")
                .cash(0L)
                .build();
        given(memberRepository.findById(1L)).willReturn(Optional.of(member));

        CashResponse response = cashReadService.getCash(1L);

        assertThat(response.cash()).isZero();
        then(memberRepository).should().findById(1L);
    }
}

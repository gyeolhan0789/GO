package com.wecandoit.cash.controller.response;

public record CashResponse(
        long cash
) {

    public static CashResponse of(long cash) {
        return new CashResponse(cash);
    }
}

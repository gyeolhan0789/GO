package com.wecandoit.item.domain;

import org.springframework.test.util.ReflectionTestUtils;

public final class MemberItemFixture {

    private MemberItemFixture() {
    }

    public static MemberItem memberItem(Long id, Long memberId, Long itemId) {
        MemberItem memberItem = new MemberItem();
        ReflectionTestUtils.setField(memberItem, "id", id);
        ReflectionTestUtils.setField(memberItem, "memberId", memberId);
        ReflectionTestUtils.setField(memberItem, "itemId", itemId);
        return memberItem;
    }
}

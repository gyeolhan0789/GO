package com.wecandoit.notification.event;

import com.wecandoit.notification.domain.NotificationType;
import org.springframework.stereotype.Component;

@Component
public class NotificationMessageFactory {

    public NotificationRequestedEvent friendInvite(Long recipientMemberId) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.FRIEND_INVITE,
                "게임 초대가 도착했어요",
                "친구가 함께 산책하자고 초대했어요."
        );
    }

    public NotificationRequestedEvent friendRequest(Long recipientMemberId) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.FRIEND_REQUEST,
                "친구 요청이 도착했어요",
                "누군가 친구 요청을 보냈어요."
        );
    }

    public NotificationRequestedEvent walkStart(Long recipientMemberId) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.WALK_START,
                "협동 산책이 시작됐어요",
                "함께하는 산책이 시작됐어요. 지금 확인해보세요."
        );
    }

    public NotificationRequestedEvent battleResult(Long recipientMemberId) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.BATTLE_RESULT,
                "대결 결과가 나왔어요",
                "방의 대결 결과를 확인해보세요."
        );
    }

    public NotificationRequestedEvent weeklyBingoRenewal(Long recipientMemberId) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.WEEKLY_BINGO_RENEWAL,
                "빙고판 갱신이 필요해요",
                "목표 걸음 수를 설정하고 새 빙고판을 발급해 주세요."
        );
    }

    public NotificationRequestedEvent rewardEarned(Long recipientMemberId, long amount) {
        return new NotificationRequestedEvent(
                recipientMemberId,
                NotificationType.REWARD_EARNED,
                "보상을 획득했어요",
                amount + "캐시를 획득했어요."
        );
    }
}

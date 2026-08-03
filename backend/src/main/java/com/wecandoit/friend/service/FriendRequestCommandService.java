package com.wecandoit.friend.service;

import com.wecandoit.friend.domain.FriendRequest;
import com.wecandoit.friend.repository.FriendRequestRepository;

import com.wecandoit.common.exception.CustomException;
import com.wecandoit.common.exception.ErrorCode;
import com.wecandoit.friend.domain.Friend;
import com.wecandoit.friend.repository.FriendRepository;
import com.wecandoit.friend.dto.SendFriendRequest;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.repository.MemberRepository;
import com.wecandoit.notification.event.NotificationMessageFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FriendRequestCommandService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendRepository friendRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationMessageFactory notificationMessageFactory;

    public void sendRequest(Long inviterId, SendFriendRequest request) {
        Long inviteeId = request.inviteeId();
        if (inviterId.equals(inviteeId)) {
            throw new CustomException(ErrorCode.SELF_FRIEND_REQUEST);
        }

        Members members = findMembersForUpdate(inviterId, inviteeId);
        if (friendRepository.existsBetween(inviterId, inviteeId)) {
            throw new CustomException(ErrorCode.ALREADY_FRIENDS);
        }

        friendRequestRepository.findPendingBetween(inviterId, inviteeId)
                .ifPresent(friendRequest -> throwExistingRequestException(friendRequest, inviterId));

        friendRequestRepository.save(FriendRequest.create(members.inviter(), members.invitee()));
        eventPublisher.publishEvent(notificationMessageFactory.friendRequest(inviteeId));
    }

    public void acceptRequest(Long inviteeId, Long requestId) {
        FriendRequest friendRequest = findRequestForUpdate(requestId);
        validateInviteeAndPending(friendRequest, inviteeId);
        lockMembers(friendRequest.getInviterId(), friendRequest.getInviteeId());

        friendRequest.accept();
        if (!friendRepository.existsBetween(
                friendRequest.getInviterId(),
                friendRequest.getInviteeId()
        )) {
            friendRepository.save(Friend.create(
                    friendRequest.getInviter(),
                    friendRequest.getInvitee()
            ));
        }
    }

    public void rejectRequest(Long inviteeId, Long requestId) {
        FriendRequest friendRequest = findRequestForUpdate(requestId);
        validateInviteeAndPending(friendRequest, inviteeId);
        friendRequest.reject();
    }

    public void cancelRequest(Long inviterId, Long requestId) {
        FriendRequest friendRequest = findRequestForUpdate(requestId);
        if (!friendRequest.isInviter(inviterId)) {
            throw new CustomException(ErrorCode.FRIEND_REQUEST_FORBIDDEN);
        }
        if (!friendRequest.isPending()) {
            throw new CustomException(ErrorCode.FRIEND_REQUEST_ALREADY_PROCESSED);
        }
        friendRequestRepository.delete(friendRequest);
    }

    private Members findMembersForUpdate(Long inviterId, Long inviteeId) {
        Long smallerId = Math.min(inviterId, inviteeId);
        Long largerId = Math.max(inviterId, inviteeId);
        Member smallerMember = memberRepository.findByIdForUpdate(smallerId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        Member largerMember = memberRepository.findByIdForUpdate(largerId)
                .orElseThrow(() -> new CustomException(ErrorCode.MEMBER_NOT_FOUND));
        if (inviterId.equals(smallerId)) {
            return new Members(smallerMember, largerMember);
        }
        return new Members(largerMember, smallerMember);
    }

    private void lockMembers(Long firstMemberId, Long secondMemberId) {
        findMembersForUpdate(firstMemberId, secondMemberId);
    }

    private FriendRequest findRequestForUpdate(Long requestId) {
        return friendRequestRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new CustomException(ErrorCode.FRIEND_REQUEST_NOT_FOUND));
    }

    private void validateInviteeAndPending(FriendRequest friendRequest, Long inviteeId) {
        if (!friendRequest.isInvitee(inviteeId)) {
            throw new CustomException(ErrorCode.FRIEND_REQUEST_FORBIDDEN);
        }
        if (!friendRequest.isPending()) {
            throw new CustomException(ErrorCode.FRIEND_REQUEST_ALREADY_PROCESSED);
        }
    }

    private void throwExistingRequestException(FriendRequest friendRequest, Long inviterId) {
        if (friendRequest.getInviterId().equals(inviterId)) {
            throw new CustomException(ErrorCode.DUPLICATE_FRIEND_REQUEST);
        }
        throw new CustomException(ErrorCode.REVERSE_FRIEND_REQUEST_EXISTS);
    }

    private record Members(Member inviter, Member invitee) {
    }
}

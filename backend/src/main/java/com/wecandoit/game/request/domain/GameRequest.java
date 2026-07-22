package com.wecandoit.game.request.domain;

import com.wecandoit.common.entity.BaseEntity;
import com.wecandoit.common.status.RequestStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "game_requests")
public class GameRequest extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "inviter_id", nullable = false)
    private Long inviterId;

    @Column(name = "invitee_id", nullable = false)
    private Long inviteeId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 255)
    private RequestStatus status;

    private GameRequest(Long roomId, Long inviterId, Long inviteeId) {
        this.roomId = roomId;
        this.inviterId = inviterId;
        this.inviteeId = inviteeId;
        this.status = RequestStatus.PENDING;
    }

    public static GameRequest create(Long roomId, Long inviterId, Long inviteeId) {
        return new GameRequest(roomId, inviterId, inviteeId);
    }

    public void accept() {
        status = RequestStatus.ACCEPTED;
    }

    public void reject() {
        status = RequestStatus.DECLINED;
    }

    public void cancel() {
        status = RequestStatus.CANCELED;
    }

    public boolean isPending() {
        return status == RequestStatus.PENDING;
    }

    public boolean isInviter(Long memberId) {
        return inviterId.equals(memberId);
    }

    public boolean isInvitee(Long memberId) {
        return inviteeId.equals(memberId);
    }

    public boolean isInRoom(Long roomId) {
        return this.roomId.equals(roomId);
    }
}

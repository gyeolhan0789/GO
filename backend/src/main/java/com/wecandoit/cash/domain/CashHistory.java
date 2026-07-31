package com.wecandoit.cash.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "cash_histories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_cash_histories_member_type_reference",
                columnNames = {"member_id", "transaction_type", "reference_id"}
        )
)
public class CashHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 30)
    private CashHistoryType type;

    @Column(nullable = false)
    private long amount;

    @Column(name = "reference_id", nullable = false)
    private Long referenceId;

    @Column(name = "room_id")
    private Long roomId;

    @Column(name = "item_name", length = 100)
    private String itemName;

    private CashHistory(
            Long memberId,
            CashHistoryType type,
            long amount,
            Long referenceId,
            Long roomId,
            String itemName
    ) {
        this.memberId = memberId;
        this.type = type;
        this.amount = amount;
        this.referenceId = referenceId;
        this.roomId = roomId;
        this.itemName = itemName;
    }

    public static CashHistory gameGoalReward(Long memberId, Long gameId, Long roomId, long amount) {
        return new CashHistory(memberId, CashHistoryType.GAME_GOAL_REWARD, amount, gameId, roomId, null);
    }

    public static CashHistory bingoCellReward(Long memberId, Long cellId, Long roomId, long amount) {
        return new CashHistory(memberId, CashHistoryType.BINGO_CELL_REWARD, amount, cellId, roomId, null);
    }

    public static CashHistory dailyStepGoalReward(
            Long memberId,
            Long bingoBoardId,
            Long roomId,
            long amount
    ) {
        return new CashHistory(
                memberId,
                CashHistoryType.DAILY_STEP_GOAL_REWARD,
                amount,
                bingoBoardId,
                roomId,
                null
        );
    }

    public static CashHistory itemPurchase(Long memberId, Long itemId, String itemName, long amount) {
        return new CashHistory(memberId, CashHistoryType.ITEM_PURCHASE, -amount, itemId, null, itemName);
    }
}

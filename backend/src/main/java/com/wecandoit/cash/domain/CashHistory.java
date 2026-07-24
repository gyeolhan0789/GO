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

    @Column(name = "item_name", length = 100)
    private String itemName;

    private CashHistory(Long memberId, CashHistoryType type, long amount, Long referenceId, String itemName) {
        this.memberId = memberId;
        this.type = type;
        this.amount = amount;
        this.referenceId = referenceId;
        this.itemName = itemName;
    }

    public static CashHistory bingoReward(Long memberId, Long roomId, long amount) {
        return new CashHistory(memberId, CashHistoryType.BINGO_REWARD, amount, roomId, null);
    }

    public static CashHistory itemPurchase(Long memberId, Long itemId, String itemName, long amount) {
        return new CashHistory(memberId, CashHistoryType.ITEM_PURCHASE, -amount, itemId, itemName);
    }
}

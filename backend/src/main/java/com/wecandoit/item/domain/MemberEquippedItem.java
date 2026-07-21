package com.wecandoit.item.domain;

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

/**
 * {@code (member_id, category)} allows one equipped item per category.
 * {@code (member_items_id)} prevents duplicate equipment of the same member item.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "member_equipped_items",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_member_equipped_items_member_category",
                columnNames = {"member_id", "category"}
        )
)
public class MemberEquippedItem extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ItemCategory category;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "member_items_id", nullable = false, unique = true)
    private Long memberItemId;
}

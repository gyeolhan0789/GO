package com.wecandoit.history.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * {@code (member_id, history_date)} allows one history per member per day.
 */
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(
        name = "member_histories",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_member_histories_member_history_date",
                columnNames = {"member_id", "history_date"}
        )
)
public class MemberHistory extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false)
    private Long memberId;

    @Column(name = "history_date", nullable = false)
    private LocalDate historyDate;

    @Column(nullable = false)
    private int step;

    @Column(nullable = false)
    private int distance;

    @Column(nullable = false)
    private int calories;

    private MemberHistory(
            Long memberId,
            LocalDate historyDate,
            int step,
            int distance,
            int calories
    ) {
        this.memberId = memberId;
        this.historyDate = historyDate;
        this.step = step;
        this.distance = distance;
        this.calories = calories;
    }

    public static MemberHistory create(
            Long memberId,
            LocalDate historyDate,
            int step,
            int distance,
            int calories
    ) {
        return new MemberHistory(memberId, historyDate, step, distance, calories);
    }

    public void add(int step, int distance, int calories) {
        this.step += step;
        this.distance += distance;
        this.calories += calories;
    }
}

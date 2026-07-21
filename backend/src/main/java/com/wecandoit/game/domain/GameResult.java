package com.wecandoit.game.domain;

import com.wecandoit.common.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "game_results")
public class GameResult extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(nullable = false)
    private boolean result;

    @Column(name = "bingo_count", nullable = false)
    private int bingoCount;

    @Column(name = "completed_mission_count", nullable = false)
    private int completedMissionCount;

    @Column(name = "reward_cash", nullable = false)
    private long rewardCash;

}

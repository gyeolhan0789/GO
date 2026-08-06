package com.wecandoit.mission.domain;

import com.wecandoit.common.entity.BaseEntity;
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
@Table(name = "missions")
public class Mission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mission_image_url", nullable = false, length = 2048)
    private String missionImageUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private MissionType type;

    @Column(length = 255)
    private String title;

    @Column(length = 255)
    private String detail;

    @Column(name = "decision_condition", columnDefinition = "json")
    private String decisionCondition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'MEDIUM'")
    private MissionDifficulty difficulty;

    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    private boolean isActive = true;

    private Mission(
            String missionImageUrl,
            MissionType type,
            String title,
            String detail,
            String decisionCondition,
            MissionDifficulty difficulty
    ) {
        this.missionImageUrl = missionImageUrl;
        this.type = type;
        this.title = title;
        this.detail = detail;
        this.decisionCondition = decisionCondition;
        this.difficulty = difficulty;
    }

    public static Mission create(
            String missionImageUrl,
            MissionType type,
            String title,
            String detail,
            String decisionCondition
    ) {
        return new Mission(missionImageUrl, type, title, detail, decisionCondition, MissionDifficulty.MEDIUM);
    }

    public static Mission create(
            String missionImageUrl,
            MissionType type,
            String title,
            String detail,
            String decisionCondition,
            MissionDifficulty difficulty
    ) {
        return new Mission(missionImageUrl, type, title, detail, decisionCondition, difficulty);
    }

    public void update(
            String missionImageUrl,
            MissionType type,
            String title,
            String detail,
            String decisionCondition,
            MissionDifficulty difficulty
    ) {
        if (missionImageUrl != null) {
            this.missionImageUrl = missionImageUrl;
        }
        this.type = type;
        this.title = title;
        this.detail = detail;
        this.decisionCondition = decisionCondition;
        this.difficulty = difficulty;
    }

    public void deactivate() {
        isActive = false;
    }

    public void activate() {
        isActive = true;
    }
}

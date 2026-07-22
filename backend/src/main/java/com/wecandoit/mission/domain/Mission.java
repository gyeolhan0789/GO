package com.wecandoit.mission.domain;

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
@Table(name = "missions")
public class Mission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mission_image_url", nullable = false, length = 100)
    private String missionImageUrl;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(length = 255)
    private String title;

    @Column(length = 255)
    private String detail;

    @Column(name = "decision_condition", columnDefinition = "json")
    private String decisionCondition;

    private Mission(
            String missionImageUrl,
            String type,
            String title,
            String detail,
            String decisionCondition
    ) {
        this.missionImageUrl = missionImageUrl;
        this.type = type;
        this.title = title;
        this.detail = detail;
        this.decisionCondition = decisionCondition;
    }

    public static Mission create(
            String missionImageUrl,
            String type,
            String title,
            String detail,
            String decisionCondition
    ) {
        return new Mission(missionImageUrl, type, title, detail, decisionCondition);
    }
}

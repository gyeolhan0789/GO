package com.wecandoit.avatar.domain;

import com.wecandoit.common.entity.BaseEntity;
import com.wecandoit.member.domain.Gender;
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
@Entity
@Table(name = "default_avatar_assets")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AvatarImage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, unique = true)
    private Gender gender;

    @Column(name = "image_url", nullable = false, length = 2048)
    private String imageUrl;

    private AvatarImage(Gender gender, String imageUrl) {
        this.gender = gender;
        this.imageUrl = imageUrl;
    }

    public static AvatarImage create(Gender gender, String imageUrl) {
        return new AvatarImage(gender, imageUrl);
    }

    public void changeImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}

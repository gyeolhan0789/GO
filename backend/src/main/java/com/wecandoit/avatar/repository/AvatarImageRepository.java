package com.wecandoit.avatar.repository;

import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AvatarImageRepository extends JpaRepository<AvatarImage, Long> {

    Optional<AvatarImage> findByGender(Gender gender);

    List<AvatarImage> findAllByOrderByGenderAsc();
}

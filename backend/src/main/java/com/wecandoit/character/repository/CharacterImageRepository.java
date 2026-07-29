package com.wecandoit.character.repository;

import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.member.domain.Gender;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CharacterImageRepository extends JpaRepository<CharacterImage, Long> {

    Optional<CharacterImage> findByGender(Gender gender);

    List<CharacterImage> findAllByOrderByGenderAsc();
}

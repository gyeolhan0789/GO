package com.wecandoit.character.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.wecandoit.character.domain.CharacterImage;
import com.wecandoit.member.domain.Gender;
import jakarta.persistence.EntityManager;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("기본 캐릭터 에셋 레포지토리")
class CharacterImageRepositoryTest {

    @Autowired
    private CharacterImageRepository characterImageRepository;
    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("성별로 기본 캐릭터 에셋을 조회한다")
    void findByGenderReturnsAsset() {
        // given
        characterImageRepository.save(
                CharacterImage.create(Gender.FEMALE, "/uploads/test/characters/female/default.png"));
        entityManager.flush();
        entityManager.clear();

        // when
        Optional<CharacterImage> result = characterImageRepository.findByGender(Gender.FEMALE);

        // then
        assertThat(result).isPresent();
        assertThat(result.orElseThrow().getImageUrl())
                .isEqualTo("/uploads/test/characters/female/default.png");
    }
}

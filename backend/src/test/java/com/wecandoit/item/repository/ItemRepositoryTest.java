package com.wecandoit.item.repository;

import static com.wecandoit.item.domain.ItemFixture.item;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wecandoit.item.domain.Item;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;

@DataJpaTest
@ActiveProfiles("test")
@DisplayName("아이템 저장소")
class ItemRepositoryTest {

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private EntityManager entityManager;

    @Test
    @DisplayName("아이템을 저장하고 ID로 모든 필드를 조회한다")
    void saveAndFindItem() {
        // given
        Item item = saveItem("검은 모자", "HAT", 1000L, "https://example.com/hat.png");
        clearPersistenceContext();

        // when
        Optional<Item> found = itemRepository.findById(item.getId());

        // then
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("검은 모자");
        assertThat(found.get().getCategory()).isEqualTo("HAT");
        assertThat(found.get().getPrice()).isEqualTo(1000L);
        assertThat(found.get().getImageUrl()).isEqualTo("https://example.com/hat.png");
    }

    @Test
    @DisplayName("전체 아이템 목록을 조회한다")
    void findAllReturnsItems() {
        // given
        saveItem("검은 모자", "HAT", 1000L, "https://example.com/hat.png");
        saveItem("흰 운동화", "SHOES", 2000L, "https://example.com/shoes.png");
        clearPersistenceContext();

        // when
        List<Item> items = itemRepository.findAll();

        // then
        assertThat(items)
                .extracting(Item::getName)
                .containsExactlyInAnyOrder("검은 모자", "흰 운동화");
    }

    @Test
    @DisplayName("존재하지 않는 아이템 ID를 조회하면 빈 결과를 반환한다")
    void findByIdReturnsEmptyForMissingItem() {
        // when
        Optional<Item> found = itemRepository.findById(999L);

        // then
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("문자열 카테고리로 아이템 목록을 조회한다")
    void findAllByCategoryReturnsMatchingItems() {
        // given
        saveItem("검은 모자", "HAT", 1000L, "https://example.com/black-hat.png");
        saveItem("흰 모자", "HAT", 1200L, "https://example.com/white-hat.png");
        saveItem("흰 운동화", "SHOES", 2000L, "https://example.com/shoes.png");
        clearPersistenceContext();

        // when
        List<Item> items = itemRepository.findAllByCategory("HAT");

        // then
        assertThat(items)
                .extracting(Item::getName)
                .containsExactlyInAnyOrder("검은 모자", "흰 모자");
    }

    @Test
    @DisplayName("아이템 이름은 필수이다")
    void saveRejectsNullName() {
        // given
        Item item = item(null, "HAT", 1000L, "https://example.com/hat.png");

        // when & then
        assertThatThrownBy(() -> itemRepository.saveAndFlush(item))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("아이템 카테고리는 필수이다")
    void saveRejectsNullCategory() {
        // given
        Item item = item("검은 모자", null, 1000L, "https://example.com/hat.png");

        // when & then
        assertThatThrownBy(() -> itemRepository.saveAndFlush(item))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private Item saveItem(String name, String category, long price, String imageUrl) {
        return itemRepository.saveAndFlush(item(name, category, price, imageUrl));
    }

    private void clearPersistenceContext() {
        entityManager.flush();
        entityManager.clear();
    }
}

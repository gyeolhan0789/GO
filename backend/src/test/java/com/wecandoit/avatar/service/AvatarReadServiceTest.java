package com.wecandoit.avatar.service;

import static com.wecandoit.item.domain.ItemFixture.item;
import static com.wecandoit.item.domain.MemberItemFixture.memberItem;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import com.wecandoit.avatar.domain.AvatarImage;
import com.wecandoit.avatar.repository.AvatarImageRepository;
import com.wecandoit.avatar.dto.AvatarDto;
import com.wecandoit.avatar.dto.EquippedItemDto;
import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import com.wecandoit.item.domain.MemberEquippedItem;
import com.wecandoit.item.domain.MemberItem;
import com.wecandoit.item.repository.ItemRepository;
import com.wecandoit.item.repository.MemberEquippedItemRepository;
import com.wecandoit.item.repository.MemberItemRepository;
import com.wecandoit.member.domain.Gender;
import com.wecandoit.member.domain.Member;
import com.wecandoit.member.domain.Region;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@DisplayName("아바타 조회 서비스")
@ExtendWith(MockitoExtension.class)
class AvatarReadServiceTest {

    @Mock
    private AvatarImageRepository avatarImageRepository;
    @Mock
    private MemberEquippedItemRepository memberEquippedItemRepository;
    @Mock
    private MemberItemRepository memberItemRepository;
    @Mock
    private ItemRepository itemRepository;
    @InjectMocks
    private AvatarReadService avatarReadService;

    @Test
    @DisplayName("조회된 회원들의 성별 기본 이미지와 장착 아이템을 일괄 조회한다")
    void getAvatarsReturnsGenderImageAndItems() {
        // given
        Member maleMember = member(1L, "남성회원", Gender.MALE);
        Member femaleMember = member(2L, "여성회원", Gender.FEMALE);
        MemberEquippedItem firstMemberHat =
                MemberEquippedItem.create(1L, 10L, ItemCategory.HAT);
        MemberEquippedItem secondMemberTop =
                MemberEquippedItem.create(2L, 20L, ItemCategory.TOP);
        MemberItem hat = memberItem(10L, 1L, 100L);
        MemberItem top = memberItem(20L, 2L, 200L);
        Item hatItem = item(100L, "빨간 모자", ItemCategory.HAT, "https://example.com/hat.png");
        Item topItem = item(200L, "파란 상의", ItemCategory.TOP, "https://example.com/top.png");
        given(avatarImageRepository.findAllByOrderByGenderAsc())
                .willReturn(List.of(
                        AvatarImage.create(
                                Gender.FEMALE,
                                "/uploads/avatars/female/default.png"
                        ),
                        AvatarImage.create(
                                Gender.MALE,
                                "/uploads/avatars/male/default.png"
                        )
                ));
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L, 2L)))
                .willReturn(List.of(firstMemberHat, secondMemberTop));
        given(memberItemRepository.findAllById(List.of(10L, 20L)))
                .willReturn(List.of(hat, top));
        given(itemRepository.findAllById(List.of(100L, 200L)))
                .willReturn(List.of(hatItem, topItem));

        // when
        Map<Long, AvatarDto> responses =
                avatarReadService.getAvatars(List.of(maleMember, femaleMember));

        // then
        assertThat(responses.get(1L).gender()).isEqualTo(Gender.MALE);
        assertThat(responses.get(1L).defaultImageUrl())
                .isEqualTo("/uploads/avatars/male/default.png");
        assertThat(responses.get(1L).equippedItems()).singleElement()
                .extracting(
                        EquippedItemDto::memberItemId,
                        EquippedItemDto::itemId,
                        EquippedItemDto::imageUrl
                )
                .containsExactly(10L, 100L, "https://example.com/hat.png");
        assertThat(responses.get(2L).gender()).isEqualTo(Gender.FEMALE);
        assertThat(responses.get(2L).defaultImageUrl())
                .isEqualTo("/uploads/avatars/female/default.png");
        assertThat(responses.get(2L).equippedItems()).singleElement()
                .extracting(EquippedItemDto::memberItemId)
                .isEqualTo(20L);
        then(memberEquippedItemRepository).should().findAllByMemberIdIn(List.of(1L, 2L));
        then(memberItemRepository).should().findAllById(List.of(10L, 20L));
        then(itemRepository).should().findAllById(List.of(100L, 200L));
    }

    @Test
    @DisplayName("장착 아이템이 없으면 빈 목록과 성별 기본 이미지를 반환한다")
    void getAvatarsReturnsDefaultAvatarWithoutEquippedItems() {
        // given
        Member femaleMember = member(1L, "여성회원", Gender.FEMALE);
        given(avatarImageRepository.findAllByOrderByGenderAsc())
                .willReturn(List.of(AvatarImage.create(
                        Gender.FEMALE,
                        "/uploads/avatars/female/default.png"
                )));
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(List.of());

        // when
        Map<Long, AvatarDto> responses =
                avatarReadService.getAvatars(List.of(femaleMember));

        // then
        assertThat(responses.get(1L).gender()).isEqualTo(Gender.FEMALE);
        assertThat(responses.get(1L).defaultImageUrl())
                .isEqualTo("/uploads/avatars/female/default.png");
        assertThat(responses.get(1L).equippedItems()).isEmpty();
        then(memberItemRepository).shouldHaveNoInteractions();
        then(itemRepository).shouldHaveNoInteractions();
    }

    @Test
    @DisplayName("성별 기본 이미지가 없으면 URL을 null로 반환한다")
    void getAvatarsReturnsNullWithoutDefaultImage() {
        // given
        Member maleMember = member(1L, "남성회원", Gender.MALE);
        given(avatarImageRepository.findAllByOrderByGenderAsc()).willReturn(List.of());
        given(memberEquippedItemRepository.findAllByMemberIdIn(List.of(1L)))
                .willReturn(List.of());

        // when
        Map<Long, AvatarDto> responses = avatarReadService.getAvatars(List.of(maleMember));

        // then
        assertThat(responses.get(1L).gender()).isEqualTo(Gender.MALE);
        assertThat(responses.get(1L).defaultImageUrl()).isNull();
        assertThat(responses.get(1L).equippedItems()).isEmpty();
    }

    @Test
    @DisplayName("조회된 회원이 없으면 아바타 저장소를 조회하지 않는다")
    void getAvatarsReturnsEmptyMapWithoutQueries() {
        // when
        Map<Long, AvatarDto> responses = avatarReadService.getAvatars(List.of());

        // then
        assertThat(responses).isEmpty();
        then(avatarImageRepository).shouldHaveNoInteractions();
        then(memberEquippedItemRepository).shouldHaveNoInteractions();
        then(memberItemRepository).shouldHaveNoInteractions();
        then(itemRepository).shouldHaveNoInteractions();
    }

    private Member member(Long id, String nickname, Gender gender) {
        Member member = Member.create(
                nickname + "@example.com",
                "password",
                nickname,
                Region.SEOUL,
                gender
        );
        ReflectionTestUtils.setField(member, "id", id);
        return member;
    }
}

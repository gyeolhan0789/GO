package com.wecandoit.item.repository;

import com.wecandoit.item.domain.Item;
import com.wecandoit.item.domain.ItemCategory;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findAllByAvailableForSaleTrue();

    List<Item> findAllByCategoryAndAvailableForSaleTrue(ItemCategory category);

    List<Item> findAllByIdInAndCategory(Collection<Long> itemIds, ItemCategory category);
}

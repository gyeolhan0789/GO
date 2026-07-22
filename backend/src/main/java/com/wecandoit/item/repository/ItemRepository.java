package com.wecandoit.item.repository;

import com.wecandoit.item.domain.Item;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findAllByCategory(String category);
}

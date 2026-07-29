package com.wecandoit.item.domain;

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
@Table(name = "items")
public class Item extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private long price;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "available_for_sale", nullable = false, columnDefinition = "boolean default true")
    private boolean availableForSale = true;

    private Item(String name, String category, long price, String imageUrl) {
        this.name = name;
        this.category = category;
        this.price = price;
        this.imageUrl = imageUrl;
    }

    public static Item create(String name, String category, long price, String imageUrl) {
        return new Item(name, category, price, imageUrl);
    }

    public void update(
            String name,
            String category,
            long price,
            String imageUrl,
            boolean availableForSale
    ) {
        this.name = name;
        this.category = category;
        this.price = price;
        if (imageUrl != null) {
            this.imageUrl = imageUrl;
        }
        this.availableForSale = availableForSale;
    }

    public void stopSale() {
        availableForSale = false;
    }
}

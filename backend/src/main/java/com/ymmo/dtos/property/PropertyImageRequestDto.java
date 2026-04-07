package com.ymmo.dtos.property;

import com.ymmo.entities.Property;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PropertyImageRequestDto {
    private Property property;
    private String imageUrl;
    private String description;
    private Boolean isCover;
}

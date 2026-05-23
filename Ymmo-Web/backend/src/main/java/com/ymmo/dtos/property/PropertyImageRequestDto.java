package com.ymmo.dtos.property;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PropertyImageRequestDto {
    private String imageUrl;
    private String description;
    private Boolean isCover;
}

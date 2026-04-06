package com.ymmo.dtos.property;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PropertyImageResponseDto {
    private String imageUrl;
    private String description;
    private Boolean isCover;
}

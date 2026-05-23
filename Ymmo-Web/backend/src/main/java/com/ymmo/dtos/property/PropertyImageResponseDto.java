package com.ymmo.dtos.property;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@JsonPropertyOrder({ "id", "imageUrl", "description", "isCover" })
public class PropertyImageResponseDto {
    private UUID id;
    private String imageUrl;
    private String description;
    private Boolean isCover;
}

package com.ymmo.dtos.property;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import com.ymmo.enums.PropertyType;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PropertyRequestDto {
    @NotNull
    private UUID agencyId;
    private List<PropertyImageRequestDto> propertyImages;
    @NotBlank
    private String title;
    @NotBlank
    private String description;
    @NotNull
    private PropertyType type;
    @NotBlank
    private String address;
    @NotBlank
    private String city;
    @NotBlank
    private String postalCode;
    @NotNull
    @DecimalMin("0.01")
    private BigDecimal price;
    @NotNull
    @Positive
    private int size;
    @NotNull
    @Positive
    private int roomsCount;
    @NotNull
    private boolean available;
}

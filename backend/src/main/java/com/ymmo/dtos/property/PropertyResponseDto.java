package com.ymmo.dtos.property;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.enums.PropertyType;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@JsonPropertyOrder({ "id", "agency", "title", "description", "type", "address", "city", "postalCode", "price", "size",
        "roomsCount", "available", "createdAt",
        "updatedAt" })
public class PropertyResponseDto {
    private UUID id;
    private AgencyResponseDto agency;
    private String title;
    private String description;
    private PropertyType type;
    private String address;
    private String city;
    private String postalCode;
    private BigDecimal price;
    private int size;
    private int roomsCount;
    private boolean available;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime updatedAt;
}

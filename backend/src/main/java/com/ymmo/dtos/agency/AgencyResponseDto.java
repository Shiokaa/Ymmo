package com.ymmo.dtos.agency;

import java.time.LocalDateTime;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.ymmo.enums.AgencyStatus;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@JsonPropertyOrder({ "id", "name", "description", "email", "phone", "address", "city", "postalCode", "status" })
public class AgencyResponseDto {
    private UUID id;
    private String name;
    private String description;
    private String email;
    private String address;
    private String city;
    private String postalCode;
    private String phone;
    private AgencyStatus status;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime createdAt;
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "dd-MM-yyyy HH:mm:ss")
    private LocalDateTime updatedAt;
}
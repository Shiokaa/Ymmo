package com.ymmo.dtos.request;

import java.util.UUID;

import com.ymmo.enums.RequestType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RequestCreateDto {
    @NotNull
    private UUID propertyId;
    @NotNull
    private RequestType type;
    @NotBlank
    private String message;
}

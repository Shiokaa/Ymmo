package com.ymmo.dtos.request;

import com.ymmo.enums.RequestStatus;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RequestStatusDto {
    @NotNull
    private RequestStatus status;
}

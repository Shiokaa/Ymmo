package com.ymmo.dtos.agency;

import com.ymmo.enums.AgencyStatus;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AgencyRequestDto {
    @NotBlank
    private String name;
    @NotBlank
    private String description;
    @Email
    @NotBlank
    private String email;
    @NotBlank
    private String address;
    @NotBlank
    private String city;
    @NotBlank
    private String postalCode;
    @NotBlank
    private String phone;

    private AgencyStatus status;
}

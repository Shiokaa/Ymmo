package com.ymmo.dtos.agency;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AgencyResponse {
    private UUID id;
    private String name;
    private String description;
    private String email;
    private String address;
    private String city;
    private String postalCode;
    private String phone;

}
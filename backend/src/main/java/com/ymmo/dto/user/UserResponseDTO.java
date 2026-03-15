package com.ymmo.dto.user;

import java.util.UUID;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserResponseDTO {
    private UUID uuid;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
}

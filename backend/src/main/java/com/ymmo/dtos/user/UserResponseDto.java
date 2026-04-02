package com.ymmo.dtos.user;

import java.time.Instant;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonPropertyOrder;
import com.ymmo.enums.UserRole;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@JsonPropertyOrder({ "id", "firstName", "lastName", "email", "passwordHash", "phone", "role", "createdAt",
        "updatedAt" })
public class UserResponseDto {
    private UUID id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private UserRole role;
    private Instant createdAt;
    private Instant updatedAt;
}

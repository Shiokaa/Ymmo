package com.ymmo.dtos.user;

import com.ymmo.enums.UserRole;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserUpdateRoleDto {
    @NotNull
    private UserRole role;
}

package com.ymmo.dtos.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UserUpdatePasswordDto {
    @NotBlank
    private String oldPassword;
    @NotBlank
    @Size(min = 6)
    private String newPassword;
    @NotBlank
    private String validPassword;
}

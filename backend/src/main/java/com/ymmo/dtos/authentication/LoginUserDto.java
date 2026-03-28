package com.ymmo.dtos.authentication;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginUserDto {
    @NotBlank
    private String email;
    @NotBlank
    private String password;
}

package com.ymmo.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.user.UserResponseDto;
import com.ymmo.dtos.user.UserUpdatePasswordDto;
import com.ymmo.dtos.user.UserUpdateProfilDto;
import com.ymmo.dtos.user.UserUpdateRoleDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.UserService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

/**
 * SpEL réutilisée : l'utilisateur agit sur son propre compte, ou il est ADMIN.
 */

@RestController
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<List<UserResponseDto>>> getAllUsers() {
        return new ResponseEntity<>(GlobalResponse.success(userService.getAllUsers()), HttpStatus.OK);
    }

    @GetMapping("/users/{id}")
    @PreAuthorize("#id == authentication.principal.id.toString() or hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<UserResponseDto>> getUserById(@PathVariable String id) {
        return new ResponseEntity<>(GlobalResponse.success(userService.getUserById(id)), HttpStatus.OK);
    }

    @PutMapping("users/profile/{id}")
    @PreAuthorize("#id == authentication.principal.id.toString() or hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<UserResponseDto>> updateUserProfileById(@PathVariable String id,
            @RequestBody @Valid UserUpdateProfilDto input) {
        UserResponseDto userResponseDto = userService.updateUserProfileById(id, input);
        return new ResponseEntity<>(GlobalResponse.success(userResponseDto), HttpStatus.OK);
    }

    @PutMapping("users/password/{id}")
    @PreAuthorize("#id == authentication.principal.id.toString() or hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<HttpStatus>> updateUserPasswordById(@PathVariable String id,
            @RequestBody @Valid UserUpdatePasswordDto input) {
        userService.updateUserPasswordById(id, input);
        return new ResponseEntity<>(GlobalResponse.success(null), HttpStatus.OK);
    }

    @DeleteMapping("users/{id}")
    @PreAuthorize("#id == authentication.principal.id.toString() or hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<HttpStatus>> deleteUserById(@PathVariable String id) {
        userService.deleteUserById(id);
        return new ResponseEntity<>(GlobalResponse.success(null), HttpStatus.OK);
    }

    @PutMapping("users/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<GlobalResponse<UserResponseDto>> updateUserRoleById(@PathVariable String id,
            @RequestBody @Valid UserUpdateRoleDto input) {
        UserResponseDto userResponseDto = userService.updateUserRoleById(id, input);
        return new ResponseEntity<>(GlobalResponse.success(userResponseDto), HttpStatus.OK);
    }
}

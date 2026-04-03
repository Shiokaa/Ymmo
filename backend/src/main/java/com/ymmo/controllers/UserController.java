package com.ymmo.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.user.UserResponseDto;
import com.ymmo.dtos.user.UserUpdateProfilDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.UserService;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public ResponseEntity<GlobalResponse<List<UserResponseDto>>> getAllUsers() {
        return new ResponseEntity<>(GlobalResponse.success(userService.getAllUsers()), HttpStatus.OK);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<GlobalResponse<UserResponseDto>> getUserById(@PathVariable String id) {
        return new ResponseEntity<>(GlobalResponse.success(userService.getUserById(id)), HttpStatus.OK);
    }

    @PutMapping("users/profile/{id}")
    public ResponseEntity<GlobalResponse<UserResponseDto>> updateUserProfileById(@Valid @PathVariable String id,
            @RequestBody UserUpdateProfilDto input) {
        UserResponseDto userResponseDto = userService.updateUserProfileById(id, input);
        return new ResponseEntity<>(GlobalResponse.success(userResponseDto), HttpStatus.OK);
    }
}

package com.ymmo.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dto.user.UserRequestDTO;
import com.ymmo.dto.user.UserResponseDTO;
import com.ymmo.services.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponseDTO> register(@RequestBody @Valid UserRequestDTO userRequestDTO) {

        UserResponseDTO userResponseDTO = userService.create(userRequestDTO);

        return new ResponseEntity<>(userResponseDTO, HttpStatus.CREATED);
    }
}

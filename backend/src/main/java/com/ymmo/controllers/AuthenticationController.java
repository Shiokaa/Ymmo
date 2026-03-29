package com.ymmo.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.authentication.LoginResponse;
import com.ymmo.dtos.authentication.LoginUserDto;
import com.ymmo.dtos.authentication.RegisterUserDto;
import com.ymmo.entities.User;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.AuthenticationService;
import com.ymmo.services.JwtService;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RequestMapping("/auth")
@RestController
public class AuthenticationController {
    private final JwtService jwtService;
    @Value("${jwt.expiration}")
    private int jwtExpiration;

    private final AuthenticationService authenticationService;

    public AuthenticationController(JwtService jwtService, AuthenticationService authenticationService) {
        this.jwtService = jwtService;
        this.authenticationService = authenticationService;
    }

    @PostMapping("/signup")
    public ResponseEntity<HttpStatus> register(@RequestBody @Valid RegisterUserDto registerUserDto) {
        authenticationService.signup(registerUserDto);

        return new ResponseEntity<>(HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<GlobalResponse<LoginResponse>> login(@RequestBody @Valid LoginUserDto loginUserDto,
            HttpServletResponse response) {
        User authenticatedUser = authenticationService.authenticate(loginUserDto);

        String jwtToken = jwtService.generateToken(authenticatedUser);

        LoginResponse loginResponse = new LoginResponse().setToken(jwtToken)
                .setExpiresIn(jwtService.getExpirationTime());

        Cookie cookie = new Cookie("jwt", jwtToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Mettre en true en production
        cookie.setPath("/");
        cookie.setMaxAge(jwtExpiration / 1000); // jwtExpiration est en ms, division par 1000 pour le transformer en seconde

        response.addCookie(cookie);

        return new ResponseEntity<>(GlobalResponse.success(loginResponse), HttpStatus.OK);
    }
}
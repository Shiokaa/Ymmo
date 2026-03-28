package com.ymmo.services;

import com.ymmo.dtos.authentication.LoginUserDto;
import com.ymmo.dtos.authentication.RegisterUserDto;
import com.ymmo.entities.User;
import com.ymmo.exceptions.EmailAlreadyExistsException;
import com.ymmo.repositories.UserRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthenticationService {
    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final AuthenticationManager authenticationManager;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public User signup(RegisterUserDto input) {
        User user = User.builder()
                .firstName(input.getFirstName())
                .lastName(input.getLastName())
                .email(input.getEmail())
                .passwordHash(passwordEncoder.encode(input.getPassword()))
                .phone(input.getPhone())
                .build();

        try {
            userRepository.findByEmail(user.getEmail());
        } catch (DataIntegrityViolationException e) {
            throw new EmailAlreadyExistsException();
        }

        return userRepository.save(user);
    }

    public User authenticate(LoginUserDto input) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        input.getEmail(),
                        input.getPassword()));

        return userRepository.findByEmail(input.getEmail())
                .orElseThrow();
    }
}
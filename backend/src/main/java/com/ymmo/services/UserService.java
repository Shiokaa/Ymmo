package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.user.UserResponseDto;
import com.ymmo.entities.User;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.repositories.UserRepository;
import com.ymmo.utils.ConvertType;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserResponseDto> getAllUsers() {
        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"));

        List<UserResponseDto> userResponseDtos = new ArrayList<>();
        for (User user : users) {
            UserResponseDto userResponseDto = UserResponseDto.builder()
                    .id(user.getId())
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .email(user.getEmail())
                    .phone(user.getPhone())
                    .role(user.getRole())
                    .createdAt(user.getCreatedAt())
                    .updatedAt(user.getUpdatedAt()).build();

            userResponseDtos.add(userResponseDto);
        }

        return userResponseDtos;
    }

    public UserResponseDto getUserById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        User user = userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        return UserResponseDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt()).build();
    }
}

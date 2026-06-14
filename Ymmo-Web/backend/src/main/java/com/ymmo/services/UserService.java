package com.ymmo.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.user.UserResponseDto;
import com.ymmo.dtos.user.UserUpdatePasswordDto;
import com.ymmo.dtos.user.UserUpdateProfilDto;
import com.ymmo.dtos.user.UserUpdateRoleDto;
import com.ymmo.entities.User;
import com.ymmo.exceptions.BadRequestException;
import com.ymmo.exceptions.EmailAlreadyExistsException;
import com.ymmo.exceptions.InvalidCredentialsException;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.mappers.UserMapper;
import com.ymmo.repositories.UserRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserMapper userMapper;

    public List<UserResponseDto> getAllUsers() {
        List<User> users = userRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"));

        return userMapper.toDtoList(users);
    }

    public UserResponseDto getUserById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        User user = userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        return userMapper.toDto(user);
    }

    public UserResponseDto updateUserProfileById(String id, UserUpdateProfilDto input) {
        UUID uuid = ConvertType.stringToUuid(id);

        Optional<User> existingUser = userRepository.findByEmail(input.getEmail());
        if (existingUser.isPresent() && !(existingUser.get().getId().equals(uuid))) {
            throw new EmailAlreadyExistsException();
        }

        User user = userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        user.setFirstName(input.getFirstName());
        user.setLastName(input.getLastName());
        user.setEmail(input.getEmail());
        user.setPhone(input.getPhone());

        user = userRepository.save(user);

        return userMapper.toDto(user);
    }

    public void updateUserPasswordById(String id, UserUpdatePasswordDto input) {
        UUID uuid = ConvertType.stringToUuid(id);

        User user = userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        if (!(passwordEncoder.matches(input.getOldPassword(), user.getPasswordHash()))) {
            throw new InvalidCredentialsException("OLD_PASSWORD_INCORRECT");
        }

        if (!(input.getNewPassword().equals(input.getValidPassword()))) {
            throw new BadRequestException("PASSWORDS_DO_NOT_MATCH");
        }

        if (passwordEncoder.matches(input.getNewPassword(), user.getPasswordHash())) {
            throw new BadRequestException("NEW_PASSWORD_SAME_AS_OLD");
        }

        user.setPasswordHash(passwordEncoder.encode(input.getNewPassword()));

        userRepository.save(user);
    }

    public void deleteUserById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);
        userRepository.deleteById(uuid);
    }

    public UserResponseDto updateUserRoleById(String id, UserUpdateRoleDto input) {
        UUID uuid = ConvertType.stringToUuid(id);

        User user = userRepository.findById(uuid).orElseThrow(ResourceNotFound::new);
        user.setRole(input.getRole());
        user = userRepository.save(user);

        return userMapper.toDto(user);
    }
}

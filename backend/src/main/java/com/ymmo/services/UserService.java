package com.ymmo.services;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.ymmo.dto.user.UserRequestDTO;
import com.ymmo.dto.user.UserResponseDTO;
import com.ymmo.entities.User;
import com.ymmo.hashing.Hashable;
import com.ymmo.repositories.UserRepository;

@Service
public class UserService {

    private UserRepository userRepository;
    private Hashable hashing;

    public UserService(UserRepository userRepository, Hashable hashing) {
        this.userRepository = userRepository;
        this.hashing = hashing;
    }

    public UserResponseDTO create(UserRequestDTO userRequestDTO) {

        if (userRepository.findByEmail(userRequestDTO.getEmail()) != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        User user = new User();

        user.setFirstName(userRequestDTO.getFirstName());
        user.setLastName(userRequestDTO.getLastName());
        user.setEmail(userRequestDTO.getEmail());
        user.setPasswordHash(hashing.bcryptHash(userRequestDTO.getPassword()));
        user.setPhone(userRequestDTO.getPhone());

        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }

        UserResponseDTO userResponseDTO = new UserResponseDTO();

        userResponseDTO.setUuid(user.getUuid());
        userResponseDTO.setFirstName(user.getFirstName());
        userResponseDTO.setLastName(user.getLastName());
        userResponseDTO.setEmail(user.getEmail());
        userResponseDTO.setPhone(user.getPhone());

        return userResponseDTO;
    }
}

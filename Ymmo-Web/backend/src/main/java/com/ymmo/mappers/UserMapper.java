package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;

import com.ymmo.dtos.user.UserResponseDto;
import com.ymmo.entities.User;

@Mapper(componentModel = "spring")
public interface UserMapper {
    UserResponseDto toDto(User user);

    List<UserResponseDto> toDtoList(List<User> users);
}

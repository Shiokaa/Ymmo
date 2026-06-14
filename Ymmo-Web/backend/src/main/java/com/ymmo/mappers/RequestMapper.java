package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.ymmo.dtos.request.RequestResponseDto;
import com.ymmo.entities.Request;

@Mapper(componentModel = "spring")
public interface RequestMapper {
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "userId", source = "user.id")
    @Mapping(target = "userFullName", expression = "java(request.getUser().getFirstName() + \" \" + request.getUser().getLastName())")
    RequestResponseDto toDto(Request request);

    List<RequestResponseDto> toDtoList(List<Request> list);
}

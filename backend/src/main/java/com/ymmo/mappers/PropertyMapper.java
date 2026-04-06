package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.ymmo.dtos.property.PropertyImageResponseDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.entities.PropertyImage;

@Mapper(componentModel = "spring")
public interface PropertyMapper {
    @Mapping(target = "propertyImages", source = "propertyImages")
    PropertyResponseDto toDto(Property property);

    List<PropertyResponseDto> toDtoList(List<Property> properties);

    PropertyImageResponseDto toImageDto(PropertyImage image);

    List<PropertyImageResponseDto> toImageDtoList(List<PropertyImage> images);
}

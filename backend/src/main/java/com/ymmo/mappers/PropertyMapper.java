package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.ymmo.dtos.property.PropertyImageRequestDto;
import com.ymmo.dtos.property.PropertyImageResponseDto;
import com.ymmo.dtos.property.PropertyRequestDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.entities.PropertyImage;

@Mapper(componentModel = "spring")
public interface PropertyMapper {
    @Mapping(target = "propertyImages", source = "propertyImages")
    PropertyResponseDto toDto(Property property);

    List<PropertyResponseDto> toDtoList(List<Property> properties);

    @Mapping(target = "propertyImages", ignore = true)
    @Mapping(target = "agency", ignore = true)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    Property fromDto(PropertyRequestDto input);

    PropertyImageResponseDto toImageDto(PropertyImage image);

    List<PropertyImageResponseDto> toImageDtoList(List<PropertyImage> images);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "property", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deletedAt", ignore = true)
    PropertyImage fromImageDto(PropertyImageRequestDto input);

    List<PropertyImage> fromImageDtoList(List<PropertyImageRequestDto> input);
}

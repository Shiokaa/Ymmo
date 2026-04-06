package com.ymmo.services;

import java.util.List;
import java.util.UUID;

import com.ymmo.mappers.PropertyMapper;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class PropertyService {
    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;

    public List<PropertyResponseDto> getAllProperties() {
        List<Property> properties = propertyRepository.findAllWithAgencyAndImages();

        return propertyMapper.toDtoList(properties);
    }

    public PropertyResponseDto getPropertyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findByIdWithAgencyAndImages(uuid);

        return propertyMapper.toDto(property);
    }
}

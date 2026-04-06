package com.ymmo.services;

import java.util.List;

import com.ymmo.mappers.PropertyMapper;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.repositories.PropertyRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class PropertyService {
    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;

    public List<PropertyResponseDto> getAllProperties() {
        List<Property> properties = propertyRepository.findAllWithImages();

        return propertyMapper.toDtoList(properties);
    }

}

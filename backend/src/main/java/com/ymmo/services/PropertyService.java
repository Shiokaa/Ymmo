package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.repositories.PropertyRepository;

@Service
public class PropertyService {
    private PropertyRepository propertyRepository;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    public List<PropertyResponseDto> getAllProperties() {
        List<Property> properties = propertyRepository.findAll();

        List<PropertyResponseDto> propertyResponseDtos = new ArrayList<>();

        for (Property property : properties) {
            AgencyResponseDto agencyResponseDto = AgencyResponseDto.builder()
                    .id(property.getAgency().getId())
                    .name(property.getAgency().getName())
                    .description(property.getAgency().getDescription())
                    .email(property.getAgency().getEmail())
                    .phone(property.getAgency().getPhone())
                    .address(property.getAgency().getAddress())
                    .city(property.getAgency().getCity())
                    .postalCode(property.getAgency().getPostalCode())
                    .status(property.getAgency().getStatus())
                    .createdAt(property.getAgency().getCreatedAt())
                    .updatedAt(property.getAgency().getUpdatedAt()).build();

            PropertyResponseDto propertyResponseDto = PropertyResponseDto.builder()
                    .id(property.getId())
                    .agency(agencyResponseDto)
                    .title(property.getTitle())
                    .description(property.getDescription())
                    .type(property.getType())
                    .address(property.getAddress())
                    .city(property.getCity())
                    .postalCode(property.getPostalCode())
                    .price(property.getPrice())
                    .size(property.getSize())
                    .roomsCount(property.getRoomsCount())
                    .available(property.isAvailable())
                    .createdAt(property.getCreatedAt())
                    .updatedAt(property.getUpdatedAt()).build();

            propertyResponseDtos.add(propertyResponseDto);
        }

        return propertyResponseDtos;
    }
}

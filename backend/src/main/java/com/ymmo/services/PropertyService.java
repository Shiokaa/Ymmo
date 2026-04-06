package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.dtos.property.PropertyImageResponseDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Property;
import com.ymmo.entities.PropertyImage;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.repositories.PropertyImageRepository;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.utils.ConvertType;

@Service
public class PropertyService {
    private PropertyRepository propertyRepository;
    private PropertyImageRepository propertyImageRepository;

    public PropertyService(PropertyRepository propertyRepository, PropertyImageRepository propertyImageRepository) {
        this.propertyRepository = propertyRepository;
        this.propertyImageRepository = propertyImageRepository;
    }

    public List<PropertyResponseDto> getAllProperties() {
        List<Property> properties = propertyRepository.findAll();
        List<PropertyResponseDto> propertyResponseDtos = new ArrayList<>();

        for (Property property : properties) {
            List<PropertyImage> propertyImages = propertyImageRepository.findByPropertyId(property.getId());

            List<PropertyImageResponseDto> propertyImageResponseDtos = new ArrayList<>();
            for (PropertyImage propertyImage : propertyImages) {
                PropertyImageResponseDto propertyImageResponseDto = PropertyImageResponseDto.builder()
                        .imageUrl(propertyImage.getImageUrl())
                        .description(propertyImage.getDescription())
                        .isCover(propertyImage.getIsCover()).build();

                propertyImageResponseDtos.add(propertyImageResponseDto);
            }

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
                    .propertyImages(propertyImageResponseDtos)
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

    public PropertyResponseDto getPropertyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        return PropertyResponseDto.builder().build();
    }
}

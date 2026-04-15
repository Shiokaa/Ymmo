package com.ymmo.services;

import java.util.List;
import java.util.UUID;

import com.ymmo.mappers.PropertyMapper;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.property.PropertyImageRequestDto;
import com.ymmo.dtos.property.PropertyRequestDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Agency;
import com.ymmo.entities.Property;
import com.ymmo.entities.PropertyImage;
import com.ymmo.exceptions.IsCoverAlreadyExistsException;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.repositories.AgencyRepository;
import com.ymmo.repositories.PropertyImageRepository;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class PropertyService {
    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;
    private final AgencyRepository agencyRepository;
    private final PropertyImageRepository propertyImageRepository;

    public List<PropertyResponseDto> getAllProperties() {
        List<Property> properties = propertyRepository.findAllWithAgencyAndImages();

        return propertyMapper.toDtoList(properties);
    }

    public PropertyResponseDto getPropertyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findByIdWithAgencyAndImages(uuid).orElseThrow(ResourceNotFound::new);

        return propertyMapper.toDto(property);
    }

    public PropertyResponseDto createProperty(PropertyRequestDto input) {
        Agency agency = agencyRepository.findById(input.getAgencyId()).orElseThrow(ResourceNotFound::new);

        Property property = propertyMapper.fromDto(input);
        property.setAgency(agency);

        return propertyMapper.toDto(propertyRepository.save(property));
    }

    public PropertyResponseDto createPropertyImages(PropertyImageRequestDto input, String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        PropertyImage propertyImage = propertyMapper.fromImageDto(input);
        propertyImage.setProperty(property);

        try {
            propertyImageRepository.save(propertyImage);
        } catch (DataIntegrityViolationException ex) {
            throw new IsCoverAlreadyExistsException();
        }

        return propertyMapper
                .toDto(propertyRepository.findByIdWithAgencyAndImages(uuid).orElseThrow(ResourceNotFound::new));
    }

    public PropertyResponseDto updatePropertyById(PropertyRequestDto input, String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Agency agency = agencyRepository.findById(input.getAgencyId()).orElseThrow(ResourceNotFound::new);

        Property property = propertyRepository.findByIdWithAgencyAndImages(uuid).orElseThrow(ResourceNotFound::new);
        property.setAgency(agency);

        return propertyMapper.toDto(propertyRepository.save(property));
    }

    public void deletePropertyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        propertyRepository.delete(property);
    }
}

package com.ymmo.services;

import java.util.List;
import java.util.UUID;

import com.ymmo.mappers.PropertyMapper;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.ymmo.dtos.property.PropertyImageResponseDto;
import com.ymmo.dtos.property.PropertyRequestDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.entities.Agency;
import com.ymmo.entities.Property;
import com.ymmo.entities.PropertyImage;
import com.ymmo.entities.User;
import com.ymmo.enums.UserRole;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.repositories.AgencyRepository;
import com.ymmo.repositories.PropertyImageRepository;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.repositories.StaffAgencyRepository;
import com.ymmo.utils.ConvertType;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;

import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class PropertyService {
    private final PropertyRepository propertyRepository;
    private final PropertyMapper propertyMapper;
    private final AgencyRepository agencyRepository;
    private final PropertyImageRepository propertyImageRepository;
    private final FileUploadService fileUploadService;
    private final StaffAgencyRepository staffAgencyRepository;

    private void assertCanManageAgency(UUID agencyId) {
        User current = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        if (current.getRole() == UserRole.ADMIN) {
            return;
        }

        if (!staffAgencyRepository.existsByUser_IdAndAgency_Id(current.getId(), agencyId)) {
            throw new AccessDeniedException("NOT_YOUR_AGENCY");
        }
    }

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
        assertCanManageAgency(input.getAgencyId());

        Agency agency = agencyRepository.findById(input.getAgencyId()).orElseThrow(ResourceNotFound::new);

        Property property = propertyMapper.fromDto(input);
        property.setAgency(agency);

        return propertyMapper.toDto(propertyRepository.save(property));
    }

    public PropertyImageResponseDto createPropertyImage(MultipartFile file, String id, HttpServletRequest request,
            String description, Boolean isCover) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        assertCanManageAgency(property.getAgency().getId());

        String propertyImagePath = ServletUriComponentsBuilder.fromContextPath(request).path("/uploads/")
                .path(fileUploadService.fileUpload(file)).toUriString();

        PropertyImage propertyImage = PropertyImage.builder()
                .property(property)
                .imageUrl(propertyImagePath)
                .description(description)
                .isCover(isCover).build();

        propertyImage = propertyImageRepository.save(propertyImage);

        return propertyMapper.toImageDto(propertyImage);
    }

    public PropertyResponseDto updatePropertyById(PropertyRequestDto input, String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findByIdWithAgencyAndImages(uuid).orElseThrow(ResourceNotFound::new);

        assertCanManageAgency(property.getAgency().getId());
        if (!property.getAgency().getId().equals(input.getAgencyId())) {
            assertCanManageAgency(input.getAgencyId());
        }

        Agency agency = agencyRepository.findById(input.getAgencyId()).orElseThrow(ResourceNotFound::new);

        property.setAgency(agency);

        return propertyMapper.toDto(propertyRepository.save(property));
    }

    public void deletePropertyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Property property = propertyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        assertCanManageAgency(property.getAgency().getId());

        propertyRepository.delete(property);
    }

    public void deletePropertyImageById(String propertyId, String imageId) {
        UUID propertyUuid = ConvertType.stringToUuid(propertyId);
        UUID imageUuid = ConvertType.stringToUuid(imageId);

        PropertyImage propertyImage = propertyImageRepository.findById(imageUuid).orElseThrow(ResourceNotFound::new);

        if (!propertyImage.getProperty().getId().equals(propertyUuid)) {
            throw new IllegalArgumentException();
        }

        assertCanManageAgency(propertyImage.getProperty().getAgency().getId());

        propertyImageRepository.delete(propertyImage);
    }
}

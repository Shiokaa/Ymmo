package com.ymmo.controllers;

import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.property.PropertyImageRequestDto;
import com.ymmo.dtos.property.PropertyRequestDto;
import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.PropertyService;

import jakarta.validation.Valid;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
public class PropertyController {
    private final PropertyService propertyService;

    public PropertyController(PropertyService propertyService) {
        this.propertyService = propertyService;
    }

    @GetMapping("/properties")
    public ResponseEntity<GlobalResponse<List<PropertyResponseDto>>> getAllProperties() {
        return new ResponseEntity<>(GlobalResponse.success(propertyService.getAllProperties()), HttpStatus.OK);
    }

    @GetMapping("/properties/{id}")
    public ResponseEntity<GlobalResponse<PropertyResponseDto>> getPropertyById(@PathVariable String id) {
        return new ResponseEntity<>(GlobalResponse.success(propertyService.getPropertyById(id)), HttpStatus.OK);
    }

    @PostMapping("/properties")
    public ResponseEntity<GlobalResponse<PropertyResponseDto>> createProperty(
            @RequestBody @Valid PropertyRequestDto input) {
        PropertyResponseDto propertyResponseDto = propertyService.createProperty(input);
        return new ResponseEntity<>(GlobalResponse.success(propertyResponseDto), HttpStatus.CREATED);
    }

    @PostMapping("/properties/{id}/images")
    public ResponseEntity<GlobalResponse<PropertyResponseDto>> createPropertyImages(
            @RequestBody @Valid PropertyImageRequestDto input, @PathVariable String id) {
        PropertyResponseDto propertyResponseDto = propertyService.createPropertyImages(input, id);
        return new ResponseEntity<>(GlobalResponse.success(propertyResponseDto), HttpStatus.CREATED);
    }

    @PutMapping("/properties/{id}")
    public ResponseEntity<GlobalResponse<PropertyResponseDto>> updatePropertyById(@PathVariable String id,
            @RequestBody @Valid PropertyRequestDto propertyRequestDto) {
        PropertyResponseDto propertyResponseDto = propertyService.updatePropertyById(propertyRequestDto, id);
        return new ResponseEntity<>(GlobalResponse.success(propertyResponseDto),
                HttpStatus.OK);
    }

    @DeleteMapping("/properties/{id}")
    public ResponseEntity<GlobalResponse<HttpStatus>> deletePropertyById(@PathVariable String id) {
        propertyService.deletePropertyById(id);
        return new ResponseEntity<>(GlobalResponse.success(null), HttpStatus.OK);
    }

    @DeleteMapping("/properties/{propertyId}/images/{imageId}")
    public ResponseEntity<GlobalResponse<HttpStatus>> deletePropertyImageById(@PathVariable String propertyId,
            @PathVariable String imageId) {
        propertyService.deletePropertyImageById(propertyId, imageId);
        return new ResponseEntity<>(GlobalResponse.success(null), HttpStatus.OK);
    }
}

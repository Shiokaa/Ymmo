package com.ymmo.controllers;

import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.property.PropertyResponseDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.PropertyService;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

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

}

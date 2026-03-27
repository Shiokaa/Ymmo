package com.ymmo.controllers;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dto.agency.AgencyResponseDTO;
import com.ymmo.services.AgencyService;

import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api")
public class AgencyController {

    private AgencyService agencyService;

    public AgencyController(AgencyService agencyService) {
        this.agencyService = agencyService;
    }

    @GetMapping("/agencies")
    public ResponseEntity<List<AgencyResponseDTO>> getAll() {
        return agencyService.listAll();
    }
}

package com.ymmo.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.agency.AgencyResponse;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.AgencyService;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
public class AgencyController {

    private AgencyService agencyService;

    public AgencyController(AgencyService agencyService) {
        this.agencyService = agencyService;
    }

    @GetMapping("/agencies")
    public ResponseEntity<GlobalResponse<List<AgencyResponse>>> getAll() {
        return new ResponseEntity<>(GlobalResponse.success(agencyService.listAll()), HttpStatus.OK);
    }
}

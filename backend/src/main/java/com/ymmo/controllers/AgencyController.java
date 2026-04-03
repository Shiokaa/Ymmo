package com.ymmo.controllers;

import java.util.List;

import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.agency.AgencyRequestDto;
import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.AgencyService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
public class AgencyController {

    private final AgencyService agencyService;

    public AgencyController(AgencyService agencyService) {
        this.agencyService = agencyService;
    }

    @GetMapping("/agencies")
    public ResponseEntity<GlobalResponse<List<AgencyResponseDto>>> getAllAgencies() {
        return new ResponseEntity<>(GlobalResponse.success(agencyService.getAllAgencies()), HttpStatus.OK);
    }

    @GetMapping("/agencies/{id}")
    public ResponseEntity<GlobalResponse<AgencyResponseDto>> getAgencyById(@PathVariable String id) {
        return new ResponseEntity<>(GlobalResponse.success(agencyService.getAgencyById(id)), HttpStatus.OK);
    }

    @PostMapping("/agencies")
    public ResponseEntity<GlobalResponse<AgencyResponseDto>> createAgency(
            @RequestBody @Valid AgencyRequestDto agencyRequestDto) {
        AgencyResponseDto agencyResponseDto = agencyService.createAgency(agencyRequestDto);

        return new ResponseEntity<>(GlobalResponse.success(agencyResponseDto), HttpStatus.CREATED);
    }

    @PutMapping("/agencies/{id}")
    public ResponseEntity<GlobalResponse<AgencyResponseDto>> updateAgencyById(@Valid @PathVariable String id,
            @RequestBody AgencyRequestDto agencyRequestDto) {
        AgencyResponseDto agencyResponseDto = agencyService.updateAgencyById(agencyRequestDto, id);

        return new ResponseEntity<>(GlobalResponse.success(agencyResponseDto), HttpStatus.OK);
    }

    @DeleteMapping("/agencies/{id}")
    public ResponseEntity<GlobalResponse<HttpStatus>> deleteAgencyById(@PathVariable String id) {
        agencyService.deleteAgencyById(id);

        return new ResponseEntity<>(GlobalResponse.success(null), HttpStatus.OK);
    }
}
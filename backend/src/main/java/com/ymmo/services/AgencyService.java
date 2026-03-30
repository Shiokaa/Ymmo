package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyRequestDto;
import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.entities.Agency;
import com.ymmo.exceptions.EmailAlreadyExistsException;
import com.ymmo.repositories.AgencyRepository;

@Service
public class AgencyService {

    private final AgencyRepository agencyRepository;

    public AgencyService(AgencyRepository agencyRepository) {
        this.agencyRepository = agencyRepository;
    }

    public List<AgencyResponseDto> listAll() {
        List<Agency> agencies = agencyRepository.findAll();

        List<AgencyResponseDto> agenciesResponse = new ArrayList<>();
        for (Agency agency : agencies) {
            AgencyResponseDto agencyResponse = AgencyResponseDto.builder()
                    .name(agency.getName())
                    .description(agency.getDescription())
                    .email(agency.getEmail())
                    .address(agency.getAddress())
                    .city(agency.getCity())
                    .postalCode(agency.getPostalCode())
                    .phone(agency.getPhone())
                    .build();

            agenciesResponse.add(agencyResponse);
        }

        return agenciesResponse;
    }

    public AgencyResponseDto create(AgencyRequestDto agencyRequestDto) {
        Agency agency = Agency.builder()
                .name(agencyRequestDto.getName())
                .description(agencyRequestDto.getDescription())
                .email(agencyRequestDto.getEmail())
                .address(agencyRequestDto.getAddress())
                .city(agencyRequestDto.getCity())
                .postalCode(agencyRequestDto.getPostalCode())
                .phone(agencyRequestDto.getPhone()).build();

        try {
            agency = agencyRepository.save(agency);
        } catch (DataIntegrityViolationException e) {
            throw new EmailAlreadyExistsException();
        }

        return AgencyResponseDto.builder()
                .id(agency.getId())
                .name(agency.getName())
                .description(agency.getDescription())
                .email(agency.getEmail())
                .address(agency.getAddress())
                .city(agency.getCity())
                .postalCode(agency.getPostalCode())
                .phone(agency.getPhone())
                .status(agency.getStatus()).build();
    }
}

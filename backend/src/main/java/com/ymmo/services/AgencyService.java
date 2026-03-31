package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyRequestDto;
import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.entities.Agency;
import com.ymmo.exceptions.EmailAlreadyExistsException;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.repositories.AgencyRepository;
import com.ymmo.utils.ConvertType;

@Service
public class AgencyService {

    private final AgencyRepository agencyRepository;

    public AgencyService(AgencyRepository agencyRepository) {
        this.agencyRepository = agencyRepository;
    }

    public List<AgencyResponseDto> getAllAgencies() {
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

    public AgencyResponseDto createAgency(AgencyRequestDto input) {
        Agency agency = Agency.builder()
                .name(input.getName())
                .description(input.getDescription())
                .email(input.getEmail())
                .address(input.getAddress())
                .city(input.getCity())
                .postalCode(input.getPostalCode())
                .phone(input.getPhone())
                .status(input.getStatus()).build();

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

    public AgencyResponseDto updateAgencyById(AgencyRequestDto input, String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Optional<Agency> existingAgency = agencyRepository.findByEmail(input.getEmail());
        if (existingAgency.isPresent() && !existingAgency.get().getId().equals(uuid)) {
            throw new EmailAlreadyExistsException();
        }

        Agency agency = agencyRepository.findById(uuid)
                .orElseThrow(ResourceNotFound::new);

        agency.setName(input.getName());
        agency.setDescription(input.getDescription());
        agency.setEmail(input.getEmail());
        agency.setAddress(input.getAddress());
        agency.setCity(input.getCity());
        agency.setPostalCode(input.getPostalCode());
        agency.setPhone(input.getPhone());
        agency.setStatus(input.getStatus());

        agency = agencyRepository.save(agency);

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

    public void deleteAgencyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        agencyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);
        agencyRepository.deleteById(uuid);
    }
}

package com.ymmo.services;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyRequestDto;
import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.entities.Agency;
import com.ymmo.exceptions.EmailAlreadyExistsException;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.mappers.AgencyMapper;
import com.ymmo.repositories.AgencyRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class AgencyService {

    private final AgencyRepository agencyRepository;
    private final AgencyMapper agencyMapper;

    public List<AgencyResponseDto> getAllAgencies() {
        List<Agency> agencies = agencyRepository.findAll(Sort.by(Sort.Direction.ASC, "createdAt"));

        return agencyMapper.toDtoList(agencies);
    }

    public AgencyResponseDto getAgencyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Agency agency = agencyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        return agencyMapper.toDto(agency);
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

        return agencyMapper.toDto(agency);
    }

    public AgencyResponseDto updateAgencyById(AgencyRequestDto input, String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Optional<Agency> existingAgency = agencyRepository.findByEmail(input.getEmail());
        if (existingAgency.isPresent() && !(existingAgency.get().getId().equals(uuid))) {
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

        return agencyMapper.toDto(agency);
    }

    public void deleteAgencyById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        agencyRepository.findById(uuid).orElseThrow(ResourceNotFound::new);
        agencyRepository.deleteById(uuid);
    }
}

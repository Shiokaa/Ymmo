package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.ymmo.dto.agency.AgencyResponseDTO;
import com.ymmo.entities.Agency;
import com.ymmo.repositories.AgencyRepository;

@Service
public class AgencyService {

    private AgencyRepository agencyRepository;

    public AgencyService(AgencyRepository agencyRepository) {
        this.agencyRepository = agencyRepository;
    }

    public ResponseEntity<List<AgencyResponseDTO>> listAll() {
        List<Agency> agencies = agencyRepository.findAll();

        if (agencies.isEmpty()) {
            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
        }

        List<AgencyResponseDTO> agencyResponseDTOs = new ArrayList<>();

        for (Agency agency : agencies) {
            AgencyResponseDTO agencyResponseDTO = new AgencyResponseDTO();

            agencyResponseDTO.setId(agency.getId());
            agencyResponseDTO.setName(agency.getName());
            agencyResponseDTO.setDescription(agency.getDescription());
            agencyResponseDTO.setEmail(agency.getEmail());
            agencyResponseDTO.setAddress(agency.getAddress());
            agencyResponseDTO.setCity(agency.getCity());
            agencyResponseDTO.setPostalCode(agency.getPostalCode());
            agencyResponseDTO.setPhone(agency.getPhone());

            agencyResponseDTOs.add(agencyResponseDTO);
        }

        return new ResponseEntity<>(agencyResponseDTOs, HttpStatus.OK);
    }
}

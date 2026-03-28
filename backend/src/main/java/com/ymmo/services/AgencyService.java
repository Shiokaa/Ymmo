package com.ymmo.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.ymmo.dtos.agency.AgencyResponse;
import com.ymmo.entities.Agency;
import com.ymmo.repositories.AgencyRepository;

@Service
public class AgencyService {

    private AgencyRepository agencyRepository;

    public AgencyService(AgencyRepository agencyRepository) {
        this.agencyRepository = agencyRepository;
    }

    public List<AgencyResponse> listAll() {
        List<Agency> agencies = agencyRepository.findAll();

        List<AgencyResponse> agenciesResponse = new ArrayList<>();
        for (Agency agency : agencies) {
            AgencyResponse agencyResponse = AgencyResponse.builder()
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
}

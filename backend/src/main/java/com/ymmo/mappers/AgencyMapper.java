package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;

import com.ymmo.dtos.agency.AgencyResponseDto;
import com.ymmo.entities.Agency;

@Mapper(componentModel = "spring")
public interface AgencyMapper {
    AgencyResponseDto toDto(Agency agency);

    List<AgencyResponseDto> toDtoList(List<Agency> agencies);
}
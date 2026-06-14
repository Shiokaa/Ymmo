package com.ymmo.mappers;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.ymmo.dtos.transaction.TransactionResponseDto;
import com.ymmo.entities.Transaction;

@Mapper(componentModel = "spring")
public interface TransactionMapper {
    @Mapping(target = "propertyId", source = "property.id")
    @Mapping(target = "propertyTitle", source = "property.title")
    @Mapping(target = "clientId", source = "client.id")
    @Mapping(target = "clientFullName", expression = "java(t.getClient().getFirstName() + \" \" + t.getClient().getLastName())")
    @Mapping(target = "agentId", source = "agent.id")
    @Mapping(target = "agentFullName", expression = "java(t.getAgent() == null ? null : t.getAgent().getFirstName() + \" \" + t.getAgent().getLastName())")
    TransactionResponseDto toDto(Transaction t);

    List<TransactionResponseDto> toDtoList(List<Transaction> transactions);
}

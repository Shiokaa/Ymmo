package com.ymmo.services;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.transaction.TransactionCreateDto;
import com.ymmo.dtos.transaction.TransactionResponseDto;
import com.ymmo.dtos.transaction.TransactionUpdateDto;
import com.ymmo.entities.Property;
import com.ymmo.entities.Transaction;
import com.ymmo.entities.User;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.mappers.TransactionMapper;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.repositories.TransactionRepository;
import com.ymmo.repositories.UserRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class TransactionService {
    private final TransactionRepository transactionRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final TransactionMapper transactionMapper;

    public TransactionResponseDto create(TransactionCreateDto dto, User agent) {
        Property property = propertyRepository.findById(dto.getPropertyId()).orElseThrow(ResourceNotFound::new);
        User client = userRepository.findById(dto.getClientId()).orElseThrow(ResourceNotFound::new);

        Transaction transaction = Transaction.builder()
                .property(property)
                .client(client)
                .agent(agent)
                .amount(dto.getAmount())
                .build();

        return transactionMapper.toDto(transactionRepository.save(transaction));
    }

    public List<TransactionResponseDto> getAll() {
        List<Transaction> transactions = transactionRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return transactionMapper.toDtoList(transactions);
    }

    public List<TransactionResponseDto> getMine(User client) {
        List<Transaction> transactions = transactionRepository.findByClient_IdOrderByCreatedAtDesc(client.getId());

        return transactionMapper.toDtoList(transactions);
    }

    public TransactionResponseDto getById(String id) {
        UUID uuid = ConvertType.stringToUuid(id);

        Transaction transaction = transactionRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        return transactionMapper.toDto(transaction);
    }

    public TransactionResponseDto update(String id, TransactionUpdateDto dto) {
        UUID uuid = ConvertType.stringToUuid(id);

        Transaction transaction = transactionRepository.findById(uuid).orElseThrow(ResourceNotFound::new);

        transaction.setStatus(dto.getStatus());
        if (dto.getAmount() != null) {
            transaction.setAmount(dto.getAmount());
        }

        return transactionMapper.toDto(transactionRepository.save(transaction));
    }
}

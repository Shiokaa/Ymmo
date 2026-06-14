package com.ymmo.controllers;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.transaction.TransactionCreateDto;
import com.ymmo.dtos.transaction.TransactionResponseDto;
import com.ymmo.dtos.transaction.TransactionUpdateDto;
import com.ymmo.entities.User;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.TransactionService;

import jakarta.validation.Valid;

@RestController
public class TransactionController {
    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping("/transactions")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<TransactionResponseDto>> createTransaction(
            @RequestBody @Valid TransactionCreateDto dto, @AuthenticationPrincipal User agent) {
        TransactionResponseDto transactionResponseDto = transactionService.create(dto, agent);
        return new ResponseEntity<>(GlobalResponse.success(transactionResponseDto), HttpStatus.CREATED);
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<List<TransactionResponseDto>>> getAllTransactions() {
        return new ResponseEntity<>(GlobalResponse.success(transactionService.getAll()), HttpStatus.OK);
    }

    @GetMapping("/transactions/me")
    public ResponseEntity<GlobalResponse<List<TransactionResponseDto>>> getMyTransactions(
            @AuthenticationPrincipal User user) {
        return new ResponseEntity<>(GlobalResponse.success(transactionService.getMine(user)), HttpStatus.OK);
    }

    @GetMapping("/transactions/{id}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<TransactionResponseDto>> getTransactionById(@PathVariable String id) {
        return new ResponseEntity<>(GlobalResponse.success(transactionService.getById(id)), HttpStatus.OK);
    }

    @PutMapping("/transactions/{id}")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<TransactionResponseDto>> updateTransaction(@PathVariable String id,
            @RequestBody @Valid TransactionUpdateDto dto) {
        return new ResponseEntity<>(GlobalResponse.success(transactionService.update(id, dto)), HttpStatus.OK);
    }
}

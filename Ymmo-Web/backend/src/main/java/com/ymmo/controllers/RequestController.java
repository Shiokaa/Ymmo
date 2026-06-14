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

import com.ymmo.dtos.request.RequestCreateDto;
import com.ymmo.dtos.request.RequestResponseDto;
import com.ymmo.dtos.request.RequestStatusDto;
import com.ymmo.entities.User;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.RequestService;

import jakarta.validation.Valid;

@RestController
public class RequestController {
    private final RequestService requestService;

    public RequestController(RequestService requestService) {
        this.requestService = requestService;
    }

    @PostMapping("/requests")
    public ResponseEntity<GlobalResponse<RequestResponseDto>> create(@RequestBody @Valid RequestCreateDto dto,
            @AuthenticationPrincipal User user) {
        RequestResponseDto requestResponseDto = requestService.create(dto, user);
        return new ResponseEntity<>(GlobalResponse.success(requestResponseDto), HttpStatus.CREATED);
    }

    @GetMapping("/requests/me")
    public ResponseEntity<GlobalResponse<List<RequestResponseDto>>> getMine(@AuthenticationPrincipal User user) {
        return new ResponseEntity<>(GlobalResponse.success(requestService.getMine(user)), HttpStatus.OK);
    }

    @GetMapping("/requests")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<List<RequestResponseDto>>> getAll() {
        return new ResponseEntity<>(GlobalResponse.success(requestService.getAll()), HttpStatus.OK);
    }

    @PutMapping("/requests/{id}/status")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<RequestResponseDto>> updateStatus(@PathVariable String id,
            @RequestBody @Valid RequestStatusDto dto) {
        return new ResponseEntity<>(GlobalResponse.success(requestService.updateStatus(id, dto)), HttpStatus.OK);
    }
}

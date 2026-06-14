package com.ymmo.services;

import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.ymmo.dtos.request.RequestCreateDto;
import com.ymmo.dtos.request.RequestResponseDto;
import com.ymmo.dtos.request.RequestStatusDto;
import com.ymmo.entities.Property;
import com.ymmo.entities.Request;
import com.ymmo.entities.User;
import com.ymmo.exceptions.ResourceNotFound;
import com.ymmo.mappers.RequestMapper;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.repositories.RequestRepository;
import com.ymmo.utils.ConvertType;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class RequestService {
    private final RequestRepository requestRepository;
    private final PropertyRepository propertyRepository;
    private final RequestMapper requestMapper;

    public RequestResponseDto create(RequestCreateDto dto, User currentUser) {
        Property property = propertyRepository.findById(dto.getPropertyId()).orElseThrow(ResourceNotFound::new);

        Request request = Request.builder()
                .property(property)
                .user(currentUser)
                .type(dto.getType())
                .message(dto.getMessage())
                .build();

        return requestMapper.toDto(requestRepository.save(request));
    }

    public List<RequestResponseDto> getMine(User currentUser) {
        List<Request> requests = requestRepository.findByUser_IdOrderByCreatedAtDesc(currentUser.getId());

        return requestMapper.toDtoList(requests);
    }

    public List<RequestResponseDto> getAll() {
        List<Request> requests = requestRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        return requestMapper.toDtoList(requests);
    }

    public RequestResponseDto updateStatus(String id, RequestStatusDto dto) {
        Request request = requestRepository.findById(ConvertType.stringToUuid(id)).orElseThrow(ResourceNotFound::new);

        request.setStatus(dto.getStatus());

        return requestMapper.toDto(requestRepository.save(request));
    }
}

package com.ymmo.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ymmo.entities.Request;

@Repository
public interface RequestRepository extends JpaRepository<Request, UUID> {
    List<Request> findByUser_IdOrderByCreatedAtDesc(UUID userId);
}

package com.ymmo.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ymmo.entities.StaffAgency;

@Repository
public interface StaffAgencyRepository extends JpaRepository<StaffAgency, UUID> {
    boolean existsByUser_IdAndAgency_Id(UUID userId, UUID agencyId);
}

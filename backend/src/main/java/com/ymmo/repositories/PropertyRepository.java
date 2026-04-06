package com.ymmo.repositories;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.ymmo.entities.Property;

@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    
}

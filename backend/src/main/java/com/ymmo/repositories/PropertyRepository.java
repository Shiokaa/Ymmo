package com.ymmo.repositories;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.ymmo.entities.Property;

@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    @Query("SELECT p FROM Property p LEFT JOIN FETCH p.propertyImages LEFT JOIN FETCH p.agency")
    List<Property> findAllWithImages();
}

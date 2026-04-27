package com.ymmo.repositories;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.ymmo.entities.Property;

@Repository
public interface PropertyRepository extends JpaRepository<Property, UUID> {
    @Query("SELECT p FROM Property p LEFT JOIN FETCH p.agency LEFT JOIN FETCH p.propertyImages")
    List<Property> findAllWithAgencyAndImages();

    @Query("SELECT p FROM Property p LEFT JOIN FETCH p.agency LEFT JOIN FETCH p.propertyImages WHERE p.id = :id")
    Optional<Property> findByIdWithAgencyAndImages(@Param("id") UUID id);
}

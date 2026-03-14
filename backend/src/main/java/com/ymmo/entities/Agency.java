package com.ymmo.entities;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import com.ymmo.enums.AgencyStatus;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "agencies")
public class Agency {
    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    private String name;
    @NotNull
    private String description;
    @NotNull
    private String email;
    @NotNull
    private String address;
    @NotNull
    private String city;
    @NotNull
    private int postal_code;
    @NotNull
    private int phone;
    @NotNull
    private AgencyStatus status;

    @CreatedDate
    @NotNull
    private Instant createdAt;
    @LastModifiedDate
    @NotNull
    private Instant updatedAt;
    @Nullable
    private Timestamp deletedAt;
}

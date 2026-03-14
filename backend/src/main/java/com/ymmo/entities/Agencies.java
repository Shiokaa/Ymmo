package com.ymmo.entities;

import java.security.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.ymmo.enums.Agency_Status;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotNull;

@Entity
@EntityListeners(AuditingEntityListener.class)
public class Agencies {
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
    private Agency_Status status;

    @CreatedDate
    @NotNull
    private Instant created_at;
    @LastModifiedDate
    @NotNull
    private Instant updated_at;
    @Nullable
    private Timestamp deleted_at;
}

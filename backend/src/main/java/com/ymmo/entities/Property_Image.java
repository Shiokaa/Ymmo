package com.ymmo.entities;

import java.security.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

@Entity
public class Property_Image {
    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotNull
    private String image_url;
    @NotNull
    private String description;
    @NotNull
    private Boolean is_cover;

    @ManyToOne
    @JoinColumn(name = "property_uuid")
    @NotNull
    private Property property;

    @CreatedDate
    @NotNull
    private Instant created_at;
    @LastModifiedDate
    @NotNull
    private Instant updated_at;
    @Nullable
    private Timestamp deleted_at;
}

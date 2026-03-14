package com.ymmo.entities;

import java.security.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import com.ymmo.enums.Property_Type;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.validation.constraints.NotNull;

@Entity
public class Property {
    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "agency_uuid")
    @NotNull
    private Agency agency;

    @NotNull
    private String title;
    @NotNull
    private String description;
    @NotNull
    private Property_Type type;
    @NotNull
    private String address;
    @NotNull
    private String city;
    @NotNull
    private int postal_code;
    @NotNull
    private float price;
    @NotNull
    private int size;
    @NotNull
    private int rooms_count;
    @NotNull
    @Value("true")
    private boolean is_available;

    @CreatedDate
    @NotNull
    private Instant created_at;
    @LastModifiedDate
    @NotNull
    private Instant updated_at;
    @Nullable
    private Timestamp deleted_at;
}

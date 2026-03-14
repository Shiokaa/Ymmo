package com.ymmo.entities;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import com.ymmo.enums.PropertyType;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "properties")
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
    private PropertyType type;
    @NotNull
    private String address;
    @NotNull
    private String city;
    @NotNull
    private int postalCode;
    @NotNull
    private float price;
    @NotNull
    private int size;
    @NotNull
    private int roomsCount;
    @NotNull
    @Value("true")
    private boolean isAvailable;

    @CreatedDate
    @NotNull
    private Instant createdAt;
    @LastModifiedDate
    @NotNull
    private Instant updatedAt;
    @Nullable
    private Timestamp deletedAt;
}

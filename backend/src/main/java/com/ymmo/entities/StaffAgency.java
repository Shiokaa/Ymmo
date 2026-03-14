package com.ymmo.entities;

import java.sql.Timestamp;
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
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "staff_agencies")
public class StaffAgency {
    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_uuid")
    @NotNull
    private User user;

    @ManyToOne
    @JoinColumn(name = "agency_uuid")
    @NotNull
    private Agency agency;

    @CreatedDate
    @NotNull
    private Instant created_at;
    @LastModifiedDate
    @NotNull
    private Instant updated_at;
    @Nullable
    private Timestamp deleted_at;
}

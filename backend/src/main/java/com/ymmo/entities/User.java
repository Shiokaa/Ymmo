package com.ymmo.entities;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;

import com.ymmo.enums.UserRole;

import jakarta.annotation.Nullable;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;

@Entity
@Table(name = "users")
public class User {

    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID uuid;

    @NotNull
    private String first_name;
    @NotNull
    private String last_name;
    @NotNull
    private String email;
    @NotNull
    private String passwordHash;
    @NotNull
    private int phone;
    @NotNull
    private UserRole role;

    @CreatedDate
    @NotNull
    private Instant createdAt;
    @LastModifiedDate
    @NotNull
    private Instant updatedAt;
    @Nullable
    private Timestamp deletedAt;
}

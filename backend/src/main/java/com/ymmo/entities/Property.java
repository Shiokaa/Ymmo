package com.ymmo.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import com.ymmo.enums.PropertyType;

import jakarta.annotation.Nullable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "properties")
@EntityListeners(AuditingEntityListener.class)
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class Property {
    // Génération d'un UUID automatiquement
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "agency_id")
    @NotNull
    private Agency agency;

    @OneToMany(mappedBy = "property", fetch = FetchType.LAZY)
    private List<PropertyImage> propertyImages;

    @NotNull
    private String title;
    @NotNull
    private String description;
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(50) DEFAULT 'HOUSE'")
    @Builder.Default
    private PropertyType type = PropertyType.HOUSE;
    @NotNull
    private String address;
    @NotNull
    private String city;
    @NotNull
    private String postalCode;
    @NotNull
    private BigDecimal price;
    @NotNull
    private int size;
    @NotNull
    private int roomsCount;
    @NotNull
    @Column(columnDefinition = "boolean DEFAULT true")
    private boolean available;

    @CreatedDate
    @NotNull
    private LocalDateTime createdAt;
    @LastModifiedDate
    @NotNull
    private LocalDateTime updatedAt;
    @Nullable
    private LocalDateTime deletedAt;
}

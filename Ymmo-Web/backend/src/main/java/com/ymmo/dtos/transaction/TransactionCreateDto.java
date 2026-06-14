package com.ymmo.dtos.transaction;

import java.math.BigDecimal;
import java.util.UUID;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransactionCreateDto {
    @NotNull
    private UUID propertyId;
    @NotNull
    private UUID clientId;
    @Nullable
    private BigDecimal amount;
}

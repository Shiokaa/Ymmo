package com.ymmo.dtos.transaction;

import java.math.BigDecimal;

import com.ymmo.enums.TransactionStatus;

import jakarta.annotation.Nullable;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TransactionUpdateDto {
    @NotNull
    private TransactionStatus status;
    @Nullable
    private BigDecimal amount;
}

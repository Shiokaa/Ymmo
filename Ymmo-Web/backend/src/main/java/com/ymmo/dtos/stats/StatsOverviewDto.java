package com.ymmo.dtos.stats;

import java.math.BigDecimal;
import java.util.Map;

import com.ymmo.enums.PropertyType;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class StatsOverviewDto {
    private long totalProperties;
    private long availableProperties;
    private long totalAgencies;
    private long totalUsers;
    private Map<PropertyType, Long> propertiesByType;
    private Map<String, Long> propertiesByCity;
    private BigDecimal averagePrice;
}

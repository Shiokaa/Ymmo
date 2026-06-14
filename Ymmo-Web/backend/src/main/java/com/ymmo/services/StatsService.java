package com.ymmo.services;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.ymmo.dtos.stats.StatsOverviewDto;
import com.ymmo.entities.Property;
import com.ymmo.enums.PropertyType;
import com.ymmo.repositories.AgencyRepository;
import com.ymmo.repositories.PropertyRepository;
import com.ymmo.repositories.UserRepository;

import lombok.AllArgsConstructor;

@Service
@AllArgsConstructor
public class StatsService {
    private final PropertyRepository propertyRepository;
    private final AgencyRepository agencyRepository;
    private final UserRepository userRepository;

    public StatsOverviewDto getOverview() {
        List<Property> properties = propertyRepository.findAll();

        long totalProperties = properties.size();
        long availableProperties = properties.stream().filter(Property::isAvailable).count();

        Map<PropertyType, Long> propertiesByType = properties.stream()
                .collect(Collectors.groupingBy(Property::getType, Collectors.counting()));

        Map<String, Long> propertiesByCity = properties.stream()
                .collect(Collectors.groupingBy(Property::getCity, Collectors.counting()));

        BigDecimal averagePrice = BigDecimal.ZERO;
        if (!properties.isEmpty()) {
            BigDecimal totalPrice = properties.stream()
                    .map(Property::getPrice)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            averagePrice = totalPrice.divide(BigDecimal.valueOf(totalProperties), 2, RoundingMode.HALF_UP);
        }

        return StatsOverviewDto.builder()
                .totalProperties(totalProperties)
                .availableProperties(availableProperties)
                .totalAgencies(agencyRepository.count())
                .totalUsers(userRepository.count())
                .propertiesByType(propertiesByType)
                .propertiesByCity(propertiesByCity)
                .averagePrice(averagePrice)
                .build();
    }
}

package com.ymmo.controllers;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ymmo.dtos.stats.StatsOverviewDto;
import com.ymmo.response.GlobalResponse;
import com.ymmo.services.StatsService;

@RestController
public class StatsController {
    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/stats/overview")
    @PreAuthorize("hasAnyRole('AGENT','ADMIN')")
    public ResponseEntity<GlobalResponse<StatsOverviewDto>> getOverview() {
        return new ResponseEntity<>(GlobalResponse.success(statsService.getOverview()), HttpStatus.OK);
    }
}

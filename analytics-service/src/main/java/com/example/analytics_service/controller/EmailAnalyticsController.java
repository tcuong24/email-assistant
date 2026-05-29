package com.example.analytics_service.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.analytics_service.dto.EmailAnalyticsDto.DailyStatResponse;
import com.example.analytics_service.dto.EmailAnalyticsDto.SummaryResponse;
import com.example.analytics_service.service.AnalyticsService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("api/v1/analytics")
@RequiredArgsConstructor
public class EmailAnalyticsController {
    private final AnalyticsService analyticsService;
    
    @GetMapping("/daily")
    public ResponseEntity<List<DailyStatResponse>> getDailyStat(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(analyticsService.getDailyStat(userId, from, to));
    }

    @GetMapping("/summary")
    public ResponseEntity<SummaryResponse> getSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(analyticsService.getSummary(userId, from, to));
    }
}

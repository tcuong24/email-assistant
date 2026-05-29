package com.example.analytics_service.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public  class EmailAnalyticsDto {
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DailyStatResponse {
        private LocalDate date;
        private long spam;
        private long important;
        private long normal;
        private long total;
    }

    // Response tổng quan
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SummaryResponse {
        private long totalSpam;
        private long totalImportant;
        private long totalNormal;
        private long grandTotal;
        private LocalDate from;
        private LocalDate to;
    }
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailReceivedEvent {
        private Long emailId;
        private Long userId;
        private String sender;
        private String subject;
        private LocalDateTime receivedAt;
    }
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
  public static class AiResultEvent {
        private Long emailId;
        private String label;
        private Long userId;
        private LocalDateTime receivedAt;
    }
}
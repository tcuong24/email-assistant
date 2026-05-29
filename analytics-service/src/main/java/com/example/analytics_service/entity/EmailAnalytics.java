package com.example.analytics_service.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.example.analytics_service.enums.EmailLabel;

import jakarta.persistence.Entity;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Setter
@Getter
@Builder
@Table(name = "email_analytics")

public class EmailAnalytics {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long emailId;
    private Long userId;
    private String sender;

    @Enumerated
    private EmailLabel  label;
    private String summary;
    private LocalDateTime receivedAt;
    private LocalDateTime processedAt;

    private LocalDate statDate;
    private Long count;
}

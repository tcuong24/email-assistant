package com.example.analytics_service.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.analytics_service.entity.EmailAnalytics;
import com.example.analytics_service.enums.EmailLabel;

public interface EmailAnalyticsRepository extends JpaRepository<EmailAnalytics, Long> {
    Optional<EmailAnalytics> findByEmailId(Long emailId);
    List<EmailAnalytics> findByUserIdAndStatDateBetweenOrderByStatDateAsc(
        Long userId, LocalDate from, LocalDate to);
    Optional<EmailAnalytics> findByUserIdAndStatDateAndLabel(Long userId, EmailLabel label, LocalDate date);
}

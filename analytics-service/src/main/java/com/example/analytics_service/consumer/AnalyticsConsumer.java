package com.example.analytics_service.consumer;

import java.time.LocalDate;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.RequestMapping;

import com.example.analytics_service.dto.EmailAnalyticsDto.AiResultEvent;
import com.example.analytics_service.service.AnalyticsService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j

public class AnalyticsConsumer {
    private final AnalyticsService analyticsService;
    @KafkaListener(topics = "ai.result", groupId = "analytics-group")
    public void consumeAIResult(AiResultEvent event){
       log.info("Analytics nhận event: emailId={} label={} userId={}",
                 event.getEmailId(), event.getLabel(), event.getUserId());
        LocalDate date = event.getReceivedAt() != null 
        ? event.getReceivedAt().toLocalDate()
        : LocalDate.now();
        analyticsService.recordEmailProcessed(event.getUserId(), event.getLabel(), date);
    }
}

package com.example.email_service.consumer;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.example.email_service.dto.EmailEventDto.AiResultEvent;
import com.example.email_service.service.EmailService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AiResultConsumer {

    private final EmailService emailService;

    @KafkaListener(
        topics = "${app.kafka.topics.ai-result}",
        groupId = "email-service"
    )
    public void consume(AiResultEvent event) {
        log.info("Nhận AI result cho email {}: {}", 
                 event.getEmailId(), event.getLabel());
        emailService.updateAiResult(event);
    }
}

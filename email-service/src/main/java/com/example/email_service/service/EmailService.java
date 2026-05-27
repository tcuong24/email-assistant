package com.example.email_service.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import com.example.email_service.dto.EmailEventDto.AiResultEvent;
import com.example.email_service.dto.EmailEventDto.EmailReceivedEvent;
import com.example.email_service.dto.EmailEventDto.ReceiveEmailRequest;
import com.example.email_service.entity.Email;
import com.example.email_service.repository.EmailRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailRepository emailRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Value("${app.kafka.topics.email-received}")
    private String emailReceivedTopic;

    // Nhận email mới (từ webhook hoặc API giả lập)
    @Transactional
    public Email receiveEmail(ReceiveEmailRequest request, Long userId) {
        Email email = Email.builder()
                .fromAddress(request.getFromAddress())
                .subject(request.getSubject())
                .body(request.getBody())
                .userId(userId)
                .label(Email.AiLabel.PENDING)
                .build();

        email = emailRepository.save(email);

        // Publish event lên Kafka — AI service sẽ consume
        EmailReceivedEvent event = EmailReceivedEvent.builder()
                .emailId(email.getId())
                .fromAddress(email.getFromAddress())
                .subject(email.getSubject())
                .body(email.getBody())
                .userId(email.getUserId())
                .receivedAt(email.getReceivedAt())
                .build();

        kafkaTemplate.send(emailReceivedTopic, 
                           String.valueOf(email.getId()), event);

        log.info("Email {} nhận và publish lên Kafka", email.getId());
        return email;
    }

    // Cập nhật kết quả AI (gọi từ Kafka consumer)
    @Transactional
    public void updateAiResult(AiResultEvent event) {
        emailRepository.findById(event.getEmailId()).ifPresent(email -> {
            email.setLabel(Email.AiLabel.valueOf(event.getLabel()));
            email.setSummary(event.getSummary());
            email.setSuggestedReplies(
                String.join("||", event.getSuggestedReplies())
            );
            emailRepository.save(email);
            log.info("Email {} cập nhật AI result: {}", 
                     email.getId(), event.getLabel());
        });
    }

    public List<Email> getEmailsByUser(Long userId) {
        return emailRepository.findByUserIdOrderByReceivedAtDesc(userId);
    }

    public Email getEmailById(Long id, Long userId) {
        return emailRepository.findById(id)
                .filter(e -> e.getUserId().equals(userId))
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));
    }
}
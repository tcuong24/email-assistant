package com.example.email_service.service;

import java.net.http.HttpHeaders;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.email_service.dto.EmailEventDto.AiResultEvent;
import com.example.email_service.dto.EmailEventDto.EmailReceivedEvent;
import com.example.email_service.dto.EmailEventDto.ReceiveEmailRequest;
import com.example.email_service.entity.Email;
import com.example.email_service.entity.NylasConnection;
import com.example.email_service.repository.EmailRepository;
import com.example.email_service.repository.NylasConnectionRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailRepository emailRepository;
    private final NylasConnectionRepository nylasConnectionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;


    @Async
    public void syncHistoricalEmails (String grantId, Long userId, String nylasApiKey , String nylasApiUrl){
        try {
            RestTemplate restTemplate = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setBearerAuth(nylasApiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = nylasApiKey + "/v3/grants/" + grantId +"/messages?limit=20";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET,entity,Map.class);
            
           if (response.getStatusCode() == org.springframework.http.HttpStatus.OK && response.getBody() != null) {
            List<Map<String, Object>> messages = 
                    (List<Map<String, Object>>) response.getBody().get("data");
            if (messages != null) {
                log.info("Bắt đầu đồng bộ {} email cũ cho userId {}", messages.size(), userId);
                for (Map<String, Object> msg : messages) {
                    String subject = (String) msg.get("subject");
                    String body = (String) msg.get("body");
                    
                    // Lấy địa chỉ email người gửi từ mảng "from"
                    List<Map<String, Object>> fromList = 
                            (List<Map<String, Object>>) msg.get("from");
                    String fromAddress = "";
                    if (fromList != null && !fromList.isEmpty()) {
                        fromAddress = (String) fromList.get(0).get("email");
                    }
                    // Tận dụng hàm receiveEmail đã viết sẵn để lưu DB và publish lên Kafka cho AI xử lý
                    ReceiveEmailRequest request = new ReceiveEmailRequest();
                    request.setSubject(subject != null ? subject : "(Không có tiêu đề)");
                    request.setBody(body != null ? body : "");
                    request.setFromAddress(fromAddress != null ? fromAddress : "");
                    this.receiveEmail(request, userId);
                }
                log.info("Hoàn tất đẩy {} email cũ lên hàng đợi xử lý AI cho userId {}", messages.size(), userId);
            }
        }
        } catch (Exception e) {
            log.error("Lỗi đồng bộ email lịch sử cho userId {}: {}", userId, e.getMessage());
        }
    }
    @Transactional
    public void saveNylasConnection(Long userId, String grantId) {
        NylasConnection connection = NylasConnection.builder()
                .userId(userId)
                .grantId(grantId)
                .build();
        nylasConnectionRepository.save(connection);
        log.info("Saved Nylas connection mapping: userId={}, grantId={}", userId, grantId);
    }

    public Long findUserIdByGrantId(String grantId) {
        return nylasConnectionRepository.findByGrantId(grantId)
                .map(NylasConnection::getUserId)
                .orElse(null);
    }

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
                .label(Email.EmailLabel.PENDING)
                .build();

        email = emailRepository.save(email);

        // Publish event lên Kafka — AI service sẽ consume
        EmailReceivedEvent event = EmailReceivedEvent.builder()
                .emailId(email.getId())
                .fromAddress(email.getFromAddress())
                .subject(email.getSubject())
                .body(email.getBody())
                .userId(email.getUserId())
                .receivedAt(email.getReceivedAt() != null ? email.getReceivedAt().toString() : null)
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
            email.setLabel(Email.EmailLabel.valueOf(event.getLabel()));
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
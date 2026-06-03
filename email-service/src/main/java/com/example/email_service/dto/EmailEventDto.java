package com.example.email_service.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

public class EmailEventDto {

    // Nhận email mới (từ webhook hoặc API giả lập)
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReceiveEmailRequest {
        private String fromAddress;
        private String subject;
        private String body;
        private LocalDateTime receivedAt;
        private String snippet;
        private boolean hasAttachments;
        private String fromName;
        private String threadId;
        private boolean isRead;
        private String category; // PRIMARY, SOCIAL, PROMOTIONS, UPDATES, FORUMS
    }

    // Gửi lên topic email.received
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailReceivedEvent {
        private Long emailId;
        private String fromAddress;
        private String subject;
        private String body;
        private Long userId;
        private String receivedAt;
        private String snippet;
        private boolean hasAttachments;
        private String fromName;
        private String threadId;
        private boolean isRead;
        private String category; // PRIMARY, SOCIAL, PROMOTIONS, UPDATES, FORUMS
    }

    // Nhận từ topic ai.result
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AiResultEvent {
        private Long emailId;
        private String label; // SPAM / IMPORTANT / NORMAL
        private String summary;
        private List<String> suggestedReplies;
    }

    // Gửi notification cho UI (via WebSocket)
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailNotification {
        private Long emailId;
        private String subject;
        private String label;
        private String summary;
        private LocalDateTime processedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SendEmailRequest {
        private String to;
        private String subject;
        private String body;
        private String replyToMessageId; // optional
    }
}

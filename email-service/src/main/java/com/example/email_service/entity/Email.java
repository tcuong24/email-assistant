package com.example.email_service.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
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
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "emails")

public class Email {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fromAddress;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EmailLabel label = EmailLabel.PENDING;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private EmailCategory category = EmailCategory.PRIMARY;

    @Column(columnDefinition = "TEXT")
    private String summary;

    // JSON array gợi ý reply — lưu dạng string
    @Column(columnDefinition = "TEXT")
    private String suggestedReplies;

    @Column(nullable = false)
    private Long userId; // owner

    private LocalDateTime receivedAt;
    @Column(columnDefinition = "TEXT")
    private String snippet;
    
    @Builder.Default
    private boolean hasAttachments = false;
    
    private String fromName; 
    private String threadId; 
    
    @Builder.Default
    private boolean isRead = false;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    public enum EmailLabel {
        PENDING, SPAM, IMPORTANT, NORMAL, WORK, PERSONAL
    }

    public enum EmailCategory {
        PRIMARY, SOCIAL, PROMOTIONS, UPDATES, FORUMS
    }
}

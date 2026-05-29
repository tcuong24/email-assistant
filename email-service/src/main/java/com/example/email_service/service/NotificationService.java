package com.example.email_service.service;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import com.example.email_service.dto.EmailEventDto.EmailNotification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final SimpMessagingTemplate messagingTemplate;

    // Push notification đến đúng user khi AI xử lý xong
    public void notifyEmailProcessed(Long userId, EmailNotification notification) {
        String destination = "/topic/emails/" + userId;
        messagingTemplate.convertAndSend(destination, notification);
        log.info("Pushed notification to userId={}: emailId={}",
                 userId, notification.getEmailId());
    }
}
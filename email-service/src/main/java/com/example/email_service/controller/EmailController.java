package com.example.email_service.controller;

import java.util.List;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.email_service.dto.EmailEventDto.ReceiveEmailRequest;
import com.example.email_service.entity.Email;
import com.example.email_service.service.EmailService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
public class EmailController {

    private final EmailService emailService;

    // Giả lập nhận email mới
    @PostMapping("/receive")
    public ResponseEntity<Email> receiveEmail(
            @RequestBody @Valid ReceiveEmailRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(emailService.receiveEmail(request, userId));
    }

    // Lấy danh sách email của user
    @GetMapping
    public ResponseEntity<List<Email>> getEmails(
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.getEmailsByUser(userId));
    }

    // Lấy chi tiết 1 email
    @GetMapping("/{id}")
    public ResponseEntity<Email> getEmail(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.getEmailById(id, userId));
    }
}
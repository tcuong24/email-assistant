package com.example.email_service.controller;

import java.util.List;
import java.util.Map;

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

    // ── NYLAS INTEGRATION ──────────────────────────────────────────────

    @org.springframework.beans.factory.annotation.Value("${NYLAS_CLIENT_ID:}")
    private String nylasClientId;

    @org.springframework.beans.factory.annotation.Value("${NYLAS_API_KEY:}")
    private String nylasApiKey;

    @org.springframework.beans.factory.annotation.Value("${app.nylas.redirect-uri:https://emailflow-ai.netlify.app/oauth/callback}")
    private String nylasRedirectUri;

    @org.springframework.beans.factory.annotation.Value("${NYLAS_API_URL:https://api.us.nylas.com}")
    private String nylasApiUrl;

    // Đổi code lấy grant_id từ Nylas sau khi OAuth thành công
    @PostMapping("/nylas/connect")
    public ResponseEntity<?> connectNylas(
            @RequestBody java.util.Map<String, String> body,
            @RequestHeader("X-User-Id") Long userId) {

        String code = body.get("code");
        if (code == null || code.isEmpty()) {
            return ResponseEntity.badRequest().body("Mã code không hợp lệ");
        }

        try {
            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setBearerAuth(nylasApiKey);

            java.util.Map<String, String> requestBody = new java.util.HashMap<>();
            requestBody.put("client_id", nylasClientId);
            requestBody.put("client_secret", nylasApiKey);
            requestBody.put("code", code);
            requestBody.put("redirect_uri", nylasRedirectUri);
            requestBody.put("grant_type", "authorization_code");

            org.springframework.http.HttpEntity<java.util.Map<String, String>> entity = new org.springframework.http.HttpEntity<>(
                    requestBody, headers);

            org.springframework.http.ResponseEntity<java.util.Map> response = restTemplate.postForEntity(
                    nylasApiUrl + "/v3/connect/token",
                    entity,
                    java.util.Map.class);

            if (response.getStatusCode() == org.springframework.http.HttpStatus.OK && response.getBody() != null) {
                String grantId = (String) response.getBody().get("grant_id");
                if (grantId != null) {
                    emailService.saveNylasConnection(userId, grantId);
                    emailService.syncHistoricalEmails(grantId, userId, nylasApiKey, nylasApiUrl);
                    return ResponseEntity.ok(java.util.Map.of("status", "success", "grantId", grantId));
                }
            }
        } catch (Exception e) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi trao đổi token Nylas: " + e.getMessage());
        }
        return ResponseEntity.badRequest().body("Kết nối hòm thư Nylas thất bại");
    }

    // Xác thực Webhook của Nylas (Bắt buộc phải trả về challenge)
    @GetMapping("/nylas-webhook")
    public ResponseEntity<String> verifyNylasWebhook(
            @org.springframework.web.bind.annotation.RequestParam("challenge") String challenge) {
        return ResponseEntity.ok(challenge);
    }

    // Nhận email thật thời gian thực từ Nylas Webhook
    @PostMapping("/nylas-webhook")
    public ResponseEntity<?> handleNylasWebhook(@RequestBody java.util.Map<String, Object> payload) {
        try {
            String type = (String) payload.get("type");
            if ("message.created".equals(type)) {
                java.util.Map<String, Object> data = (java.util.Map<String, Object>) payload.get("data");
                if (data != null) {
                    String grantId = (String) data.get("grant_id");
                    java.util.Map<String, Object> object = (java.util.Map<String, Object>) data.get("object");
                    if (grantId != null && object != null) {
                        String subject = (String) object.get("subject");
                        String body = (String) object.get("body");

                        List<Map<String, Object>> fromList = (List<Map<String, Object>>) object.get("from");
                        String fromAddress = "";
                        String fromName = "";
                        if (fromList != null && !fromList.isEmpty()) {
                            fromAddress = (String) fromList.get(0).get("email");
                            fromName = (String) fromList.get(0).get("name");
                        }

                        String threadId = (String) object.get("thread_id");
                        boolean unread = object.get("unread") != null ? (boolean) object.get("unread") : true;
                        boolean isRead = !unread;
                        String snippet = (String) object.get("snippet");
                        java.util.List<?> attachments = (java.util.List<?>) object.get("attachments");
                        boolean hasAttachments = attachments != null && !attachments.isEmpty();

                        Long userId = emailService.findUserIdByGrantId(grantId);
                        if (userId != null) {
                            ReceiveEmailRequest request = new ReceiveEmailRequest();
                            request.setSubject(subject != null ? subject : "(Không có tiêu đề)");
                            request.setBody(body != null ? body : "");
                            request.setFromAddress(fromAddress != null ? fromAddress : "");
                            request.setSnippet(snippet != null ? snippet : "");
                            request.setHasAttachments(hasAttachments);
                            request.setFromName(fromName != null && !fromName.isEmpty() ? fromName : fromAddress);
                            request.setThreadId(threadId);
                            request.setRead(isRead);
                            emailService.receiveEmail(request, userId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Không làm gì, trả về 200 để tránh Nylas block webhook
        }
        return ResponseEntity.ok().build();
    }
}
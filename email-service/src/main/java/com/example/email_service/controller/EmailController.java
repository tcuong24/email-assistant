package com.example.email_service.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.email_service.entity.Email.EmailCategory;

import com.example.email_service.dto.EmailEventDto.ReceiveEmailRequest;
import com.example.email_service.entity.Email;
import com.example.email_service.service.EmailService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/emails")
@RequiredArgsConstructor
@Slf4j
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

    // Lấy danh sách email của user (có thể lọc theo category)
    @GetMapping
    public ResponseEntity<Page<Email>> getEmails(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(required = false) EmailCategory category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        if (category != null) {
            return ResponseEntity.ok(emailService.getEmailsByUserAndCategory(userId, category, pageable));
        }
        return ResponseEntity.ok(emailService.getEmailsByUser(userId, pageable));
    }

    // Lấy danh sách thư đã gửi (SENT)
    @GetMapping("/sent")
    public ResponseEntity<Page<Email>> getSentEmails(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        return ResponseEntity.ok(emailService.getSentEmails(userId, pageable));
    }

    // Lấy danh sách thư nháp (DRAFT)
    @GetMapping("/drafts")
    public ResponseEntity<Page<Email>> getDraftEmails(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("receivedAt").descending());
        return ResponseEntity.ok(emailService.getDraftEmails(userId, pageable));
    }

    // Lấy chi tiết 1 email
    @GetMapping("/{id}")
    public ResponseEntity<Email> getEmail(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.getEmailById(id, userId));
    }

    // Phân tích email bằng AI khi click xem thư
    @PostMapping("/{id}/analyze")
    public ResponseEntity<Email> analyzeEmail(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.triggerAiAnalysis(id, userId));
    }

    // Lấy trạng thái kết nối Nylas
    @GetMapping("/nylas/status")
    public ResponseEntity<Map<String, Boolean>> getNylasStatus(@RequestHeader("X-User-Id") Long userId) {
        String grantId = emailService.findGrantIdByUserId(userId);
        boolean connected = grantId != null && !grantId.isEmpty();
        return ResponseEntity.ok(Map.of("connected", connected));
    }

    // Kích hoạt đồng bộ email
    @PostMapping("/sync")
    public ResponseEntity<?> syncEmails(@RequestHeader("X-User-Id") Long userId) {
        String grantId = emailService.findGrantIdByUserId(userId);
        if (grantId == null || grantId.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Hòm thư chưa được kết nối"));
        }
        emailService.syncHistoricalEmails(grantId, userId, nylasApiKey, nylasApiUrl);
        return ResponseEntity.ok(Map.of("status", "success", "message", "Bắt đầu đồng bộ email"));
    }

    // Lấy thông số thống kê email của người dùng
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getEmailStats(@RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.getEmailStats(userId));
    }

    // Lấy tất cả email trong một luồng (thread)
    @GetMapping("/thread/{threadId}")
    public ResponseEntity<List<Email>> getThreadEmails(
            @PathVariable String threadId,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.getEmailsByThread(threadId, userId));
    }

    // Gửi email mới hoặc phản hồi
    @PostMapping("/send")
    public ResponseEntity<Email> sendEmail(
            @RequestBody @Valid com.example.email_service.dto.EmailEventDto.SendEmailRequest request,
            @RequestHeader("X-User-Id") Long userId) {
        return ResponseEntity.ok(emailService.sendEmail(request, userId));
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
        log.info("Nylas GET webhook verification triggered: challenge={}", challenge);
        return ResponseEntity.ok(challenge);
    }

    // Nhận email thật thời gian thực từ Nylas Webhook
    @PostMapping("/nylas-webhook")
    public ResponseEntity<?> handleNylasWebhook(@RequestBody java.util.Map<String, Object> payload) {
        log.info("Nylas POST webhook received payload: {}", payload);
        try {
            String type = (String) payload.get("type");
            log.info("Webhook event type: {}", type);
            if ("message.created".equals(type)) {
                java.util.Map<String, Object> data = (java.util.Map<String, Object>) payload.get("data");
                if (data != null) {
                    String grantId = (String) data.get("grant_id");
                    log.info("Webhook grantId: {}", grantId);
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
                        String messageId = (String) object.get("id");
                        boolean unread = object.get("unread") != null ? (boolean) object.get("unread") : true;
                        boolean isRead = !unread;
                        String snippet = (String) object.get("snippet");
                        java.util.List<?> attachments = (java.util.List<?>) object.get("attachments");
                        boolean hasAttachments = attachments != null && !attachments.isEmpty();

                        Long userId = emailService.findUserIdByGrantId(grantId);
                        if (userId != null) {
                            log.info("Mapped grantId {} to userId {}. Processing receive...", grantId, userId);
                            List<String> folders = (List<String>) object.get("folders");
                            String categoryStr = emailService.extractCategory(folders).name();

                            ReceiveEmailRequest request = new ReceiveEmailRequest();
                            request.setSubject(subject != null ? subject : "(Không có tiêu đề)");
                            request.setBody(body != null ? body : "");
                            request.setFromAddress(fromAddress != null ? fromAddress : "");
                            request.setSnippet(snippet != null ? snippet : "");
                            request.setHasAttachments(hasAttachments);
                            request.setFromName(fromName != null && !fromName.isEmpty() ? fromName : fromAddress);
                            request.setThreadId(threadId);
                            request.setMessageId(messageId);
                            request.setRead(isRead);
                            Email savedEmail = emailService.receiveEmail(request, userId);
                            log.info("Email saved with ID: {}", savedEmail.getId());
                            if (hasAttachments && attachments != null) {
                                emailService.processAttachments(savedEmail, (List<Map<String, Object>>) attachments, grantId);
                            }
                        } else {
                            log.warn("Could not find mapped userId for grantId: {}", grantId);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Exception handling Nylas webhook payload: ", e);
        }
        return ResponseEntity.ok().build();
    }
}
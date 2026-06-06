package com.example.email_service.service;

import java.net.http.HttpHeaders;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
import com.example.email_service.dto.EmailEventDto.EmailNotification;
import com.example.email_service.entity.Email;
import com.example.email_service.entity.NylasConnection;
import com.example.email_service.repository.EmailRepository;
import com.example.email_service.repository.NylasConnectionRepository;
import com.example.email_service.repository.AttachmentRepository;
import com.example.email_service.entity.Attachment;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final EmailRepository emailRepository;
    private final NylasConnectionRepository nylasConnectionRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final NotificationService notificationService;
    private final AttachmentRepository attachmentRepository;
    private final CloudinaryService cloudinaryService;

    private final RestTemplate restTemplate = new RestTemplate();

    private final java.util.Set<Long> activeSyncUsers = java.util.concurrent.ConcurrentHashMap.newKeySet();

    @Value("${NYLAS_API_KEY:}")
    private String nylasApiKey;

    @Value("${NYLAS_API_URL:https://api.us.nylas.com}")
    private String nylasApiUrl;

    private List<Map<String, Object>> getNylasFolders(String grantId, String nylasApiKey, String nylasApiUrl) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(nylasApiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = nylasApiUrl + "/v3/grants/" + grantId + "/folders";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return (List<Map<String, Object>>) response.getBody().get("data");
            }
        } catch (Exception e) {
            log.error("Failed to fetch folders for grantId={}: {}", grantId, e.getMessage());
        }
        return List.of();
    }

    private void processNylasMessage(Map<String, Object> msg, String grantId, Long userId) {
        try {
            String subject = (String) msg.get("subject");
            String body = (String) msg.get("body");

            LocalDateTime emailDate = LocalDateTime.now();
            if (msg.get("date") != null) {
                long dateSeconds = ((Number) msg.get("date")).longValue();
                emailDate = LocalDateTime.ofInstant(
                        Instant.ofEpochSecond(dateSeconds),
                        ZoneId.systemDefault());
            }

            String snippet = (String) msg.get("snippet");
            List<?> attachments = (List<?>) msg.get("attachments");
            boolean hasAttachments = attachments != null && !attachments.isEmpty();
            List<Map<String, Object>> fromList = (List<Map<String, Object>>) msg.get("from");
            String fromAddress = "";
            String fromName = "";
            if (fromList != null && !fromList.isEmpty()) {
                fromAddress = (String) fromList.get(0).get("email");
                fromName = (String) fromList.get(0).get("name");
            }

            String threadId = (String) msg.get("thread_id");
            String messageId = (String) msg.get("id");
            boolean unread = msg.get("unread") != null ? (boolean) msg.get("unread") : true;
            boolean isRead = !unread;

            List<String> folders = (List<String>) msg.get("folders");
            String categoryStr = extractCategory(folders).name();

            ReceiveEmailRequest request = new ReceiveEmailRequest();
            request.setSubject(subject != null ? subject : "(Không có tiêu đề)");
            request.setBody(body != null ? body : "");
            request.setSnippet(snippet != null ? snippet : "");
            request.setHasAttachments(hasAttachments);
            request.setReceivedAt(emailDate);
            request.setFromAddress(fromAddress != null ? fromAddress : "");
            request.setFromName(fromName != null && !fromName.isEmpty() ? fromName : fromAddress);
            request.setThreadId(threadId);
            request.setMessageId(messageId);
            request.setRead(isRead);
            request.setCategory(categoryStr);

            Email savedEmail = this.receiveEmail(request, userId);
            if (hasAttachments) {
                List<Map<String, Object>> attList = (List<Map<String, Object>>) msg.get("attachments");
                processAttachments(savedEmail, attList, grantId);
            }
        } catch (Exception e) {
            log.error("Lỗi khi xử lý message từ Nylas: {}", e.getMessage());
        }
    }

    private void syncFolderEmails(String grantId, Long userId, String folderId, int maxPages, String nylasApiKey, String nylasApiUrl, org.springframework.http.HttpHeaders headers) {
        if (folderId == null || folderId.isEmpty()) return;
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        String nextCursor = null;
        int pagesSynced = 0;
        
        do {
            String url = nylasApiUrl + "/v3/grants/" + grantId + "/messages?limit=50&in=" + folderId;
            if (nextCursor != null && !nextCursor.isEmpty()) {
                url += "&page_token=" + nextCursor;
            }
            
            try {
                ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                    List<Map<String, Object>> messages = (List<Map<String, Object>>) response.getBody().get("data");
                    nextCursor = (String) response.getBody().get("next_cursor");
                    
                    if (messages != null && !messages.isEmpty()) {
                        log.info("Thư mục {}: Đồng bộ trang {} ({} email) cho userId {}", folderId, pagesSynced + 1, messages.size(), userId);
                        for (Map<String, Object> msg : messages) {
                            processNylasMessage(msg, grantId, userId);
                        }
                    } else {
                        break;
                    }
                } else {
                    break;
                }
                pagesSynced++;
                Thread.sleep(200);
            } catch (Exception e) {
                log.error("Lỗi đồng bộ thư mục {} trang {}: {}", folderId, pagesSynced + 1, e.getMessage());
                break;
            }
        } while (nextCursor != null && !nextCursor.isEmpty() && pagesSynced < maxPages);
    }

    @Async
    public void syncHistoricalEmails(String grantId, Long userId, String nylasApiKey, String nylasApiUrl) {
        if (!activeSyncUsers.add(userId)) {
            log.warn("Tiến trình đồng bộ chọn lọc (Selective Sync) đang chạy cho userId {}. Bỏ qua yêu cầu mới.", userId);
            return;
        }
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setBearerAuth(nylasApiKey);

            // Bước 1: Lấy danh sách nhãn/thư mục từ Nylas để tìm ID nhãn của Gmail
            List<Map<String, Object>> folders = getNylasFolders(grantId, nylasApiKey, nylasApiUrl);
            String inboxFolderId = "inbox";
            String personalFolderId = null;
            String promotionsFolderId = null;
            String updatesFolderId = null;
            String socialFolderId = null;
            String forumsFolderId = null;

            for (Map<String, Object> folder : folders) {
                String name = (String) folder.get("name");
                String id = (String) folder.get("id");
                if ("INBOX".equalsIgnoreCase(name)) {
                    inboxFolderId = id;
                } else if ("CATEGORY_PERSONAL".equalsIgnoreCase(name)) {
                    personalFolderId = id;
                } else if ("CATEGORY_PROMOTIONS".equalsIgnoreCase(name)) {
                    promotionsFolderId = id;
                } else if ("CATEGORY_UPDATES".equalsIgnoreCase(name)) {
                    updatesFolderId = id;
                } else if ("CATEGORY_SOCIAL".equalsIgnoreCase(name)) {
                    socialFolderId = id;
                } else if ("CATEGORY_FORUMS".equalsIgnoreCase(name)) {
                    forumsFolderId = id;
                }
            }

            log.info("Bắt đầu tiến trình đồng bộ chọn lọc (Selective Sync) cho userId {}", userId);

            // Bước 2: Đồng bộ chọn lọc theo từng nhãn với độ sâu khác nhau
            
            // 1. Thư chính (Sâu: tối đa 10 trang = 500 thư)
            String primaryTarget = (personalFolderId != null) ? personalFolderId : inboxFolderId;
            log.info("Đồng bộ thư chính (Primary) sâu cho userId {}", userId);
            syncFolderEmails(grantId, userId, primaryTarget, 10, nylasApiKey, nylasApiUrl, headers);

            // 2. Thư quảng cáo (Nông: tối đa 1 trang = 50 thư)
            if (promotionsFolderId != null) {
                log.info("Đồng bộ thư Quảng cáo (Promotions) nông cho userId {}", userId);
                syncFolderEmails(grantId, userId, promotionsFolderId, 1, nylasApiKey, nylasApiUrl, headers);
            }

            // 3. Thư cập nhật (Nông: tối đa 1 trang = 50 thư)
            if (updatesFolderId != null) {
                log.info("Đồng bộ thư Cập nhật (Updates) nông cho userId {}", userId);
                syncFolderEmails(grantId, userId, updatesFolderId, 1, nylasApiKey, nylasApiUrl, headers);
            }

            // 4. Thư mạng xã hội (Nông: tối đa 1 trang = 50 thư)
            if (socialFolderId != null) {
                log.info("Đồng bộ thư Mạng xã hội (Social) nông cho userId {}", userId);
                syncFolderEmails(grantId, userId, socialFolderId, 1, nylasApiKey, nylasApiUrl, headers);
            }

            // 5. Thư diễn đàn (Nông: tối đa 1 trang = 50 thư)
            if (forumsFolderId != null) {
                log.info("Đồng bộ thư Diễn đàn (Forums) nông cho userId {}", userId);
                syncFolderEmails(grantId, userId, forumsFolderId, 1, nylasApiKey, nylasApiUrl, headers);
            }

            log.info("Hoàn tất tiến trình đồng bộ chọn lọc cho userId {}", userId);

        } catch (Exception e) {
            log.error("Lỗi tổng quát trong đồng bộ chọn lọc cho userId {}: {}", userId, e.getMessage());
        } finally {
            activeSyncUsers.remove(userId);
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
        // Kiểm tra trùng lặp qua messageId
        if (request.getMessageId() != null && !request.getMessageId().isEmpty()) {
            Optional<Email> existingEmail = emailRepository.findByMessageId(request.getMessageId());
            if (existingEmail.isPresent()) {
                log.info("Email với messageId={} đã tồn tại. Bỏ qua.", request.getMessageId());
                return existingEmail.get();
            }
        }

        Email email = Email.builder()
                .fromAddress(request.getFromAddress())
                .subject(request.getSubject())
                .body(request.getBody())
                .userId(userId)
                .fromName(request.getFromName())
                .threadId(request.getThreadId())
                .messageId(request.getMessageId())
                .isRead(request.isRead())
                .label(Email.EmailLabel.PENDING)
                .category(request.getCategory() != null ? Email.EmailCategory.valueOf(request.getCategory()) : Email.EmailCategory.PRIMARY)
                .snippet(request.getSnippet())
                .hasAttachments(request.isHasAttachments())
                .receivedAt(request.getReceivedAt() != null ? request.getReceivedAt() : LocalDateTime.now())
                .build();

        final Email savedEmail = emailRepository.save(email);
        log.info("Email {} nhận thành công (chờ phân tích AI khi xem thư)", savedEmail.getId());

        // Gửi thông báo WebSocket ngay lập tức (sau khi commit transaction để tránh tranh chấp dữ liệu)
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendNewEmailNotification(savedEmail);
                }
            });
        } else {
            sendNewEmailNotification(savedEmail);
        }

        return savedEmail;
    }

    private void sendNewEmailNotification(Email email) {
        try {
            EmailNotification notification = EmailNotification.builder()
                    .emailId(email.getId())
                    .subject(email.getSubject())
                    .label(email.getLabel().name()) // PENDING
                    .summary("Đang chờ phân tích...")
                    .processedAt(LocalDateTime.now())
                    .build();
            notificationService.notifyEmailProcessed(email.getUserId(), notification);
            log.info("Đã gửi thông báo email mới tức thời cho emailId={} qua WebSocket", email.getId());
        } catch (Exception e) {
            log.error("Lỗi gửi thông báo WebSocket cho email mới {}: {}", email.getId(), e.getMessage());
        }
    }

    // Cập nhật kết quả AI (gọi từ Kafka consumer)
    @Transactional
    public void updateAiResult(AiResultEvent event) {
        emailRepository.findById(event.getEmailId()).ifPresent(email -> {
            // Lập trình phòng thủ: Bọc trong try-catch để tránh crash luồng Kafka khi nhận nhãn lạ
            try {
                email.setLabel(Email.EmailLabel.valueOf(event.getLabel().toUpperCase().strip()));
            } catch (IllegalArgumentException e) {
                log.warn("Nhận nhãn lạ từ AI: {}. Chuyển hướng thành NORMAL.", event.getLabel());
                email.setLabel(Email.EmailLabel.NORMAL);
            }
            email.setSummary(event.getSummary());
            email.setSuggestedReplies(
                    event.getSuggestedReplies() != null ? String.join("||", event.getSuggestedReplies()) : "");
            email.setActionItems(
                    event.getActionItems() != null ? String.join("||", event.getActionItems()) : "");
            emailRepository.save(email);
            log.info("Email {} cập nhật AI result: {}",
                    email.getId(), email.getLabel());

            // Push notification qua WebSocket
            try {
                EmailNotification notification = EmailNotification.builder()
                        .emailId(email.getId())
                        .subject(email.getSubject())
                        .label(email.getLabel().name())
                        .summary(email.getSummary())
                        .actionItems(event.getActionItems())
                        .processedAt(LocalDateTime.now())
                        .build();
                notificationService.notifyEmailProcessed(email.getUserId(), notification);
            } catch (Exception e) {
                log.error("Lỗi gửi thông báo WebSocket cho email {}: {}", email.getId(), e.getMessage());
            }
        });
    }

    public Page<Email> getEmailsByUser(Long userId, Pageable pageable) {
        return emailRepository.findByUserIdOrderByReceivedAtDesc(userId, pageable);
    }

    public List<Email> getEmailsByUser(Long userId) {
        return emailRepository.findByUserIdOrderByReceivedAtDesc(userId);
    }

    public Page<Email> getSentEmails(Long userId, Pageable pageable) {
        return emailRepository.findByUserIdAndLabelOrderByReceivedAtDesc(userId, Email.EmailLabel.SENT, pageable);
    }

    public List<Email> getSentEmails(Long userId) {
        return emailRepository.findByUserIdAndLabelOrderByReceivedAtDesc(userId, Email.EmailLabel.SENT);
    }

    public Page<Email> getDraftEmails(Long userId, Pageable pageable) {
        return emailRepository.findByUserIdAndLabelOrderByReceivedAtDesc(userId, Email.EmailLabel.DRAFT, pageable);
    }

    public List<Email> getDraftEmails(Long userId) {
        return emailRepository.findByUserIdAndLabelOrderByReceivedAtDesc(userId, Email.EmailLabel.DRAFT);
    }

    public Page<Email> getEmailsByUserAndCategory(Long userId, Email.EmailCategory category, Pageable pageable) {
        return emailRepository.findByUserIdAndCategoryOrderByReceivedAtDesc(userId, category, pageable);
    }

    public List<Email> getEmailsByUserAndCategory(Long userId, Email.EmailCategory category) {
        return emailRepository.findByUserIdAndCategoryOrderByReceivedAtDesc(userId, category);
    }

    public Email getEmailById(Long id, Long userId) {
        return emailRepository.findById(id)
                .filter(e -> e.getUserId().equals(userId))
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));
    }

    @Transactional
    public Email triggerAiAnalysis(Long emailId, Long userId) {
        Email email = emailRepository.findById(emailId)
                .filter(e -> e.getUserId().equals(userId))
                .orElseThrow(() -> new RuntimeException("Email không tồn tại"));

        if (email.getLabel() == Email.EmailLabel.PENDING && (email.getSummary() == null || email.getSummary().isEmpty())) {
            EmailReceivedEvent event = EmailReceivedEvent.builder()
                    .emailId(email.getId())
                    .fromAddress(email.getFromAddress())
                    .subject(email.getSubject())
                    .body(email.getBody())
                    .userId(email.getUserId())
                    .fromName(email.getFromName())
                    .threadId(email.getThreadId())
                    .isRead(email.isRead())
                    .snippet(email.getSnippet())
                    .hasAttachments(email.isHasAttachments())
                    .receivedAt(email.getReceivedAt() != null ? email.getReceivedAt().toString() : null)
                    .category(email.getCategory().name())
                    .build();

            kafkaTemplate.send(emailReceivedTopic, String.valueOf(email.getId()), event);
            log.info("Yêu cầu phân tích AI cho Email {} đã được gửi lên Kafka", email.getId());
        }
        return email;
    }

    public Email.EmailCategory extractCategory(List<String> folders) {
        if (folders == null) return Email.EmailCategory.PRIMARY;
        if (folders.contains("CATEGORY_PROMOTIONS")) return Email.EmailCategory.PROMOTIONS;
        if (folders.contains("CATEGORY_SOCIAL"))     return Email.EmailCategory.SOCIAL;
        if (folders.contains("CATEGORY_UPDATES"))    return Email.EmailCategory.UPDATES;
        if (folders.contains("CATEGORY_FORUMS"))     return Email.EmailCategory.FORUMS;
        return Email.EmailCategory.PRIMARY;
    }

    public String findGrantIdByUserId(Long userId) {
        return nylasConnectionRepository.findById(userId)
                .map(NylasConnection::getGrantId)
                .orElse(null);
    }

    public List<Email> getEmailsByThread(String threadId, Long userId) {
        if (threadId == null || threadId.isEmpty()) {
            return List.of();
        }
        return emailRepository.findByThreadIdAndUserIdOrderByReceivedAtAsc(threadId, userId);
    }

    @Transactional
    public void processAttachments(Email email, List<Map<String, Object>> attachmentsList, String grantId) {
        if (attachmentsList == null || attachmentsList.isEmpty() || grantId == null || grantId.isEmpty()) {
            return;
        }

        log.info("Processing {} attachments for emailId={}", attachmentsList.size(), email.getId());
        for (Map<String, Object> att : attachmentsList) {
            try {
                String fileId = (String) att.get("id");
                String filename = (String) att.get("filename");
                String contentType = (String) att.get("content_type");
                Long size = att.get("size") != null ? ((Number) att.get("size")).longValue() : 0L;

                if (fileId == null || fileId.isEmpty()) continue;

                // Skip downloading very large attachments to prevent OutOfMemoryError in 512MB RAM environment
                if (size > 5 * 1024 * 1024) { // 5MB limit
                    log.warn("Attachment {} is too large ({} bytes). Skipping download.", filename, size);
                    Attachment attachment = Attachment.builder()
                            .filename(filename != null ? filename : "unnamed")
                            .contentType(contentType)
                            .size(size)
                            .r2Url("") // Empty URL for oversized files
                            .email(email)
                            .build();
                    attachmentRepository.save(attachment);
                    continue;
                }

                // 1. Download file from Nylas
                byte[] content = downloadNylasFile(grantId, fileId);
                if (content == null || content.length == 0) {
                    log.warn("Nylas file download returned empty content for fileId={}", fileId);
                    continue;
                }

                // 2. Upload to Cloudinary
                String fileKey = "attachments/" + email.getId() + "/" + fileId + "_" + (filename != null ? filename : "unnamed");
                String r2Url = cloudinaryService.uploadFile(fileKey, content);

                // 3. Save attachment metadata in DB
                Attachment attachment = Attachment.builder()
                        .filename(filename != null ? filename : "unnamed")
                        .contentType(contentType)
                        .size(size)
                        .r2Url(r2Url)
                        .email(email)
                        .build();
                attachmentRepository.save(attachment);
                log.info("Saved attachment filename={}, r2Url={}", filename, r2Url);
            } catch (Exception e) {
                log.error("Failed to process attachment for emailId={}, error={}", email.getId(), e.getMessage());
            }
        }
    }

    private byte[] downloadNylasFile(String grantId, String fileId) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(nylasApiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = nylasApiUrl + "/v3/grants/" + grantId + "/attachments/" + fileId + "/download";
            ResponseEntity<byte[]> response = restTemplate.exchange(url, HttpMethod.GET, entity, byte[].class);
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Failed to download Nylas file grantId={}, fileId={}, error={}", grantId, fileId, e.getMessage());
        }
        return null;
    }

    @Transactional
    public Email sendEmail(com.example.email_service.dto.EmailEventDto.SendEmailRequest request, Long userId) {
        String grantId = findGrantIdByUserId(userId);
        if (grantId == null || grantId.isEmpty()) {
            throw new RuntimeException("Hòm thư chưa được kết nối");
        }

        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            headers.setBearerAuth(nylasApiKey);

            // Construct payload for Nylas
            Map<String, Object> toMap = Map.of("email", request.getTo());
            Map<String, Object> bodyMap = new java.util.HashMap<>();
            bodyMap.put("subject", request.getSubject());
            bodyMap.put("body", request.getBody());
            bodyMap.put("to", List.of(toMap));

            if (request.getReplyToMessageId() != null && !request.getReplyToMessageId().isEmpty()) {
                bodyMap.put("reply_to_message_id", request.getReplyToMessageId());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(bodyMap, headers);
            String url = nylasApiUrl + "/v3/grants/" + grantId + "/messages/send";
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);

            if (response.getStatusCode() == org.springframework.http.HttpStatus.OK && response.getBody() != null) {
                Map responseBody = response.getBody();
                Map dataMap = (Map) responseBody.get("data");
                String threadId = null;
                String messageId = null;
                if (dataMap != null) {
                    threadId = (String) dataMap.get("thread_id");
                    messageId = (String) dataMap.get("id");
                }

                String plainBody = request.getBody() != null ? request.getBody().replaceAll("<[^>]*>", "") : "";
                String snippet = plainBody.length() > 100 ? plainBody.substring(0, 100) : plainBody;

                // Lưu vào database với nhãn SENT
                Email email = Email.builder()
                        .fromAddress(userEmailFromGrantId(grantId))
                        .subject(request.getSubject())
                        .body(request.getBody())
                        .userId(userId)
                        .fromName("Me")
                        .threadId(threadId)
                        .messageId(messageId)
                        .isRead(true)
                        .label(Email.EmailLabel.SENT)
                        .category(Email.EmailCategory.PRIMARY)
                        .snippet(snippet)
                        .hasAttachments(false)
                        .receivedAt(LocalDateTime.now())
                        .build();

                return emailRepository.save(email);
            } else {
                throw new RuntimeException("Nylas API returned error status: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Lỗi gửi email cho userId {}: {}", userId, e.getMessage());
            throw new RuntimeException("Gửi email thất bại: " + e.getMessage());
        }
    }

    private String userEmailFromGrantId(String grantId) {
        try {
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setBearerAuth(nylasApiKey);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            String url = nylasApiUrl + "/v3/grants/" + grantId;
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
            if (response.getStatusCode() == org.springframework.http.HttpStatus.OK && response.getBody() != null) {
                Map body = response.getBody();
                Map data = (Map) body.get("data");
                if (data != null && data.containsKey("email")) {
                    return (String) data.get("email");
                }
            }
        } catch (Exception e) {
            log.error("Failed to fetch email for grantId={}: {}", grantId, e.getMessage());
        }
        return "me@example.com";
    }
}
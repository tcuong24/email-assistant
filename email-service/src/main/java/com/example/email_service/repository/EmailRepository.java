package com.example.email_service.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.email_service.entity.Email;

@Repository
public interface EmailRepository extends JpaRepository<Email, Long> {
    Optional<Email> findByMessageId(String messageId);
    boolean existsByMessageId(String messageId);

    Page<Email> findByUserIdOrderByReceivedAtDesc(Long userId, Pageable pageable);
    List<Email> findByUserIdOrderByReceivedAtDesc(Long userId);
    List<Email> findByUserIdAndLabel(Long userId, Email.EmailLabel label);
    Page<Email> findByUserIdAndLabelOrderByReceivedAtDesc(Long userId, Email.EmailLabel label, Pageable pageable);
    List<Email> findByUserIdAndLabelOrderByReceivedAtDesc(Long userId, Email.EmailLabel label);
    long countByUserIdAndLabel(Long userId, Email.EmailLabel label);
    long countByUserId(Long userId);
    long countByUserIdAndIsReadFalse(Long userId);
    Page<Email> findByUserIdAndCategoryOrderByReceivedAtDesc(Long userId, Email.EmailCategory category, Pageable pageable);
    List<Email> findByUserIdAndCategoryOrderByReceivedAtDesc(Long userId, Email.EmailCategory category);
    List<Email> findByThreadIdAndUserIdOrderByReceivedAtAsc(String threadId, Long userId);
}
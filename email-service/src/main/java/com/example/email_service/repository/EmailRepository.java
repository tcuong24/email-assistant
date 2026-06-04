package com.example.email_service.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.email_service.entity.Email;

@Repository
public interface EmailRepository extends JpaRepository<Email, Long> {
    List<Email> findByUserIdOrderByReceivedAtDesc(Long userId);
    List<Email> findByUserIdAndLabel(Long userId, Email.EmailLabel label);
    List<Email> findByUserIdAndLabelOrderByReceivedAtDesc(Long userId, Email.EmailLabel label);
    long countByUserIdAndLabel(Long userId, Email.EmailLabel label);
    List<Email> findByUserIdAndCategoryOrderByReceivedAtDesc(Long userId, Email.EmailCategory category);
    List<Email> findByThreadIdAndUserIdOrderByReceivedAtAsc(String threadId, Long userId);
}
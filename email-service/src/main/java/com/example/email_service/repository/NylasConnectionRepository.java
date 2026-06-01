package com.example.email_service.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.example.email_service.entity.NylasConnection;

@Repository
public interface NylasConnectionRepository extends JpaRepository<NylasConnection, Long> {
    Optional<NylasConnection> findByGrantId(String grantId);
}

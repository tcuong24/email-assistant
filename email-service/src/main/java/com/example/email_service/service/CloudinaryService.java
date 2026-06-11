package com.example.email_service.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(Optional<Cloudinary> cloudinary) {
        this.cloudinary = cloudinary.orElse(null);
    }

    public String uploadFile(String key, byte[] content) {
        if (cloudinary == null) {
            log.warn("Cloudinary is not configured. Falling back to mock URL for key: {}", key);
            return "/mock-cloudinary/" + key;
        }

        try {
            Map uploadResult = cloudinary.uploader().upload(content, ObjectUtils.asMap(
                    "resource_type", "raw",
                    "public_id", key
            ));
            String url = (String) uploadResult.get("secure_url");
            log.info("Uploaded file to Cloudinary: key={}, url={}", key, url);
            return url;
        } catch (Exception e) {
            log.error("Failed to upload file to Cloudinary: key={}, error={}", key, e.getMessage());
            throw new RuntimeException("Cloudinary upload error: " + e.getMessage());
        }
    }
}

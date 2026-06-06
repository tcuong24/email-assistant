package com.example.email_service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class EmailServiceApplication {

	public static void main(String[] args) {
		SpringApplication.run(EmailServiceApplication.class, args);
	}

	@Bean
	public CommandLineRunner initDatabase(JdbcTemplate jdbcTemplate) {
		return args -> {
			try {
				// Drop the existing check constraints on emails table to allow saving new enum values
				jdbcTemplate.execute("ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_label_check");
				jdbcTemplate.execute("ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_category_check");
				System.out.println("Successfully dropped check constraints if they existed.");
			} catch (Exception e) {
				System.err.println("Could not drop check constraints: " + e.getMessage());
			}
		};
	}
}

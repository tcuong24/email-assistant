package com.example.email_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    @Value("${app.kafka.topics.email-received}")
    private String emailReceivedTopic;

    @Value("${app.kafka.topics.ai-result}")
    private String aiResultTopic;

    @Bean
    public NewTopic emailReceivedTopic() {
        return TopicBuilder.name(emailReceivedTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic aiResultTopic() {
        return TopicBuilder.name(aiResultTopic)
                .partitions(3)
                .replicas(1)
                .build();
    }
}
package com.example.gateway_service.config;

import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import reactor.core.publisher.Mono;

import java.util.Objects;

@Configuration
public class RateLimiterConfig {

    /**
     * Định danh client dựa vào địa chỉ IP. 
     * Cách này tối ưu vì áp dụng được cho cả API public (như Login, Register).
     */
    @Bean
    public KeyResolver ipKeyResolver() {
        return exchange -> Mono.just(
            Objects.requireNonNull(exchange.getRequest().getRemoteAddress())
                   .getAddress()
                   .getHostAddress()
        );
    }
}

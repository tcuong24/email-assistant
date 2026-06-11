package com.example.gateway_service.security;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class AuthFilter implements GatewayFilter, Ordered {
    private final JwtService jwtService;
    private final List<String> publicPaths;

    public AuthFilter(JwtService jwtService, @Value("${app.public-paths}") List<String> publicPaths) {
        this.jwtService = jwtService;
        this.publicPaths = publicPaths;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getURI().getPath();

        // 1. Check if the path is public
        if (isPublicPath(path)) {
            return chain.filter(exchange);
        }

        // 2. Extract Authorization header or query parameter
        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        String token = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            token = request.getQueryParams().getFirst("token");
        }
        if (token == null || token.isEmpty()) {
            return unauthorizedResponse(exchange, "Missing token");
        }

        // 3. Validate Token
        if (!jwtService.isTokenValid(token)) {
             return unauthorizedResponse(exchange, "Missing token");
        }

        // 4. Extract Claims and populate headers for downstream services
        try {
            Long userId = jwtService.extractUserId(token);
            String username = jwtService.extractUsername(token);

            ServerHttpRequest modifiedRequest = request.mutate()
                    .header("X-User-Id", String.valueOf(userId))
                    .header("X-User-Email", username)
                    .build();

            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        } catch (Exception e) {
            log.error("Failed to extract claims from token", e);
            return unauthorizedResponse(exchange, "Internal auth error");
        }
    }

    private boolean isPublicPath(String path) {
        return publicPaths.stream().anyMatch(publicPath -> path.startsWith(publicPath)|| path.equals(publicPath));
    }

    private Mono<Void> unauthorizedResponse (ServerWebExchange exchange, String message) {
        log.warn("Authentication failed for path: {}. Reason: {}", exchange.getRequest().getURI().getPath(), message);
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(HttpStatus.UNAUTHORIZED);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        String body = """
            {"status":401,"error":"Unauthorized","message":"%s"}
            """.formatted(message);
        DataBuffer buffer = response.bufferFactory()
        .wrap(body.getBytes(StandardCharsets.UTF_8));
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -1;
    }
}

package com.example.user_service.service;

import org.springframework.stereotype.Service;

import com.example.user_service.dto.AuthDto.LoginRequest;
import com.example.user_service.dto.AuthDto.RefreshTokenRequest;
import com.example.user_service.dto.AuthDto.RegisterRequest;
import com.example.user_service.dto.AuthDto.TokenResponse;
import com.example.user_service.dto.AuthDto.UserResponse;
import com.example.user_service.entity.RefreshToken;
import com.example.user_service.entity.User;
import com.example.user_service.enums.UserRole;
import com.example.user_service.exception.EmailAlreadyExistsException;
import com.example.user_service.repository.UserRepository;
import com.example.user_service.security.JwtService;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;


@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final RefreshTokenService refreshTokenService;
     // ── Đăng ký ──────────────────────────────────────────────────
    @Transactional
    public TokenResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(
                    "Email '" + request.getEmail() + "' đã được sử dụng.");
        }

        User user = User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail().toLowerCase())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.USER)
                .build();

        userRepository.save(user);
        log.info("User mới đã đăng ký: {}", user.getEmail());

        return buildTokenResponse(user);
    }

    // ── Đăng nhập ─────────────────────────────────────────────────
    public TokenResponse login(LoginRequest request) {
        // Spring Security tự xử lý xác thực, ném exception nếu sai
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow();

        log.info("User đăng nhập: {}", user.getEmail());
        return buildTokenResponse(user);
    }

    // ── Refresh token ─────────────────────────────────────────────
    public TokenResponse refreshToken(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenService.findByToken(request.getRefreshToken());
        refreshTokenService.verifyExpiration(refreshToken);

        User user = refreshToken.getUser();
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        
        java.util.Map<String, Object> extraClaims = new java.util.HashMap<>();
        extraClaims.put("userId", user.getId());
        String newAccessToken = jwtService.generateToken(extraClaims, userDetails);

        return TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken.getToken()) // giữ nguyên refresh token
                .tokenType("Bearer")
                .expiresIn(86400)
                .user(UserResponse.from(user))
                .build();
    }

    // ── Đăng xuất ─────────────────────────────────────────────────
    @Transactional
    public void logout(String email) {
        userRepository.findByEmail(email).ifPresent(refreshTokenService::deleteByUser);
        log.info("User đã đăng xuất: {}", email);
    }

    // ── Helper ────────────────────────────────────────────────────
    private TokenResponse buildTokenResponse(User user) {
        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        
        java.util.Map<String, Object> extraClaims = new java.util.HashMap<>();
        extraClaims.put("userId", user.getId());
        String accessToken = jwtService.generateToken(extraClaims, userDetails);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user);

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(86400)
                .user(UserResponse.from(user))
                .build();
    }
}

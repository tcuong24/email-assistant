package com.example.gateway_service.factory;

import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.stereotype.Component;

import com.example.gateway_service.security.AuthFilter;

@Component
public class AuthFilterFactory extends AbstractGatewayFilterFactory<Object>{
    private final AuthFilter authFilter;

    public AuthFilterFactory (AuthFilter authFilter){
        super(Object.class);
        this.authFilter=authFilter;
    }
    @Override
    public GatewayFilter apply(Object config) {
        return authFilter;
    }
    @Override
    public String name() {
        return "AuthFilter";
    }
}

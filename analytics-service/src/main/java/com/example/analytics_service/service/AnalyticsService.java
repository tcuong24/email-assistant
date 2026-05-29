package com.example.analytics_service.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.analytics_service.dto.EmailAnalyticsDto.DailyStatResponse;
import com.example.analytics_service.dto.EmailAnalyticsDto.SummaryResponse;
import com.example.analytics_service.entity.EmailAnalytics;
import com.example.analytics_service.enums.EmailLabel;
import com.example.analytics_service.repository.EmailAnalyticsRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsService {
    private final EmailAnalyticsRepository emailAnalyticsRepository;
    
    @Transactional
    public void recordEmailProcessed (Long userId , String labelStr , LocalDate date){
        EmailLabel label = EmailLabel.valueOf(labelStr);
        upperStat(userId, label, date);
        upperStat(userId, EmailLabel.TOTAL, date);
    }
    public void upperStat(Long userId, EmailLabel label, LocalDate date){
        
        EmailAnalytics stat = emailAnalyticsRepository.findByUserIdAndStatDateAndLabel(userId, label, date)
        .orElse(EmailAnalytics.builder().userId(userId).statDate(date).label(label).count(0L).build());
        stat.setCount(stat.getCount() + 1);
        emailAnalyticsRepository.save(stat);
    }
    public List <DailyStatResponse> getDailyStat(Long userId , LocalDate from, LocalDate to){
        List<EmailAnalytics> emailAnalytics = emailAnalyticsRepository.findByUserIdAndStatDateBetweenOrderByStatDateAsc(userId, from, to);
        Map<LocalDate , List<EmailAnalytics>>  grouped = emailAnalytics.stream()
        .collect(Collectors.groupingBy(EmailAnalytics::getStatDate));
        return from.datesUntil(to.plusDays(1))
        .map(date -> {List<EmailAnalytics> dayStats  = grouped.getOrDefault(date, List.of());
            return buildDailyResponse(date, dayStats );
        }).collect(Collectors.toList());
    }
    public SummaryResponse getSummary (Long userId, LocalDate from , LocalDate to){
        List<DailyStatResponse> dailyStatResponses = getDailyStat(userId, from, to);
        return SummaryResponse.builder()
        .totalSpam(dailyStatResponses.stream().mapToLong(DailyStatResponse::getSpam).sum())
        .totalImportant(dailyStatResponses.stream().mapToLong(DailyStatResponse::getSpam).sum())
        .totalNormal(dailyStatResponses.stream().mapToLong(DailyStatResponse::getNormal).sum())
        .grandTotal(dailyStatResponses.stream().mapToLong(DailyStatResponse::getTotal).sum())
        .from(from)
        .to(to)
        .build();
    }
    private DailyStatResponse buildDailyResponse(LocalDate date, List<EmailAnalytics> stats) {
        Map<EmailLabel, Long> map = stats.stream()
        .collect(Collectors.toMap(EmailAnalytics::getLabel, EmailAnalytics::getCount
        ));
        
        return DailyStatResponse.builder()
                .date(date)
                .spam(map.getOrDefault(EmailLabel.SPAM, 0L))
                .important(map.getOrDefault(EmailLabel.IMPORTANT, 0L))
                .normal(map.getOrDefault(EmailLabel.NORMAL, 0L))
                .total(map.getOrDefault(EmailLabel.TOTAL, 0L))
                .build();
    }
}

package com.example.email_service.controller;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.example.email_service.entity.Task;
import com.example.email_service.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@Slf4j
public class TaskController {

    private final TaskRepository taskRepository;

    // Lấy toàn bộ công việc của user
    @GetMapping
    public ResponseEntity<List<Task>> getTasks(@RequestHeader("X-User-Id") Long userId) {
        log.info("Lấy danh sách công việc cho userId={}", userId);
        return ResponseEntity.ok(taskRepository.findByUserId(userId));
    }

    // Tạo công việc thủ công
    @PostMapping
    public ResponseEntity<Task> createTask(
            @RequestBody Task task,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Tạo công việc mới cho userId={}: {}", userId, task.getTitle());
        task.setUserId(userId);
        if (task.getStatus() == null) {
            task.setStatus(Task.TaskStatus.TODO);
        }
        if (task.getPriority() == null) {
            task.setPriority(Task.TaskPriority.LOW);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(taskRepository.save(task));
    }

    // Cập nhật trạng thái công việc (TODO, IN_PROGRESS, DONE)
    @PutMapping("/{id}/status")
    public ResponseEntity<Task> updateTaskStatus(
            @PathVariable Long id,
            @RequestParam Task.TaskStatus status,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Cập nhật trạng thái công việc id={} sang status={}", id, status);
        return taskRepository.findById(id)
                .filter(t -> t.getUserId().equals(userId))
                .map(task -> {
                    task.setStatus(status);
                    return ResponseEntity.ok(taskRepository.save(task));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Xóa công việc
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        log.info("Xóa công việc id={}", id);
        return taskRepository.findById(id)
                .filter(t -> t.getUserId().equals(userId))
                .map(task -> {
                    taskRepository.delete(task);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}

package com.alibou.websocket.user;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
     private final SimpMessagingTemplate messagingTemplate;

      @MessageMapping("/user.addUser")
     public void addUser(@Payload User user) {
         userService.saveUser(user);
         messagingTemplate.convertAndSend("/user/" + user.getId() + "/queue/messages", user);
     }
 
     @MessageMapping("/user.disconnectUser")
     public void disconnectUser(@Payload User user) {
         userService.disconnect(user);
         messagingTemplate.convertAndSend("/user/" + user.getId() + "/queue/messages", user);
     }
 

    @GetMapping("/users")
    public ResponseEntity<List<User>> findConnectedUsers() {
        return ResponseEntity.ok(userService.findConnectedUsers());
    }
}

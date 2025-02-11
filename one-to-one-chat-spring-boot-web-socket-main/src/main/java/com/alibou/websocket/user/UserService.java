package com.alibou.websocket.user;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository repository;

    public void saveUser(User user) {


        if (repository.existsById(user.getId())) { 
            return; 
        }
        user.setStatus(Status.ONLINE);

        
        if ("MANAGER".equalsIgnoreCase(user.getRole())) {
            user.setAssignedCustomers(new ArrayList<>()); // Ensure it's not null
            user.setAssignedManagerId(null); 
        } else if ("CUSTOMER".equalsIgnoreCase(user.getRole())) {
          
            if (user.getAssignedManagerId() == null) {
                Optional<User> manager = findManagerWithLeastCustomers();
                manager.ifPresent(m -> {
                    user.setAssignedManagerId(m.getId()); // Store only the manager's ID
                    m.getAssignedCustomers().add(user.getId()); // Store only customer ID
                    repository.save(m); // Update manager with new customer
                });
            }
        }
        repository.save(user);
    }
    
    public Optional<User> findManagerWithLeastCustomers() {
        List<User> managers = repository.findAllByRole("MANAGER");

        return managers.stream()
                .min((m1, m2) -> Integer.compare(m1.getAssignedCustomers().size(), m2.getAssignedCustomers().size()));
    }
    public void disconnect(User user) {
        var storedUser = repository.findById(user.getId()).orElse(null); // Changed nickName to id
        if (storedUser != null) {
            storedUser.setStatus(Status.OFFLINE);
            repository.save(storedUser);
        }
    }

    public List<User> findConnectedUsers() {
        return repository.findAllByStatus(Status.ONLINE);
    }

    // public List<User> getCustomersForManager(String managerId) {
    //     User manager = repository.findById(managerId).orElse(null);
    //     if (manager != null) {
    //         return repository.findAllById(manager.getAssignedCustomers());
    //     }
    //     return List.of();
    // }
    
    // public User getManagerForCustomer(String customerId) {
    //     User customer = repository.findById(customerId).orElse(null);
    //     if (customer != null && customer.getAssignedManagerId() != null) {
    //         return repository.findById(customer.getAssignedManagerId()).orElse(null);
    //     }
    //     return null;
    // }
    
}

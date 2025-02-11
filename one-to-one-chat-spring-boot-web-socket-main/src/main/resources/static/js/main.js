'use strict';

const usernamePage = document.querySelector('#username-page');
const chatPage = document.querySelector('#chat-page');
const usernameForm = document.querySelector('#usernameForm');
const messageForm = document.querySelector('#messageForm');
const messageInput = document.querySelector('#message');
const chatArea = document.querySelector('#chat-messages');
const logout = document.querySelector('#logout');

let stompClient = null;
let userId = null;
let fullname = null;
let role = null; 
let selectedUserId = null;

function connect(event) {
    userId = document.querySelector('#userId').value.trim();
    fullname = document.querySelector('#fullname').value.trim();
    role = document.querySelector('#role').value.trim();  

    if (userId && fullname) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');

        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);

        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe(`/user/${userId}/queue/messages`, onMessageReceived);
    stompClient.subscribe(`/user/public`, onMessageReceived);

    // Register the connected user
    stompClient.send("/app/user.addUser",
        {},
        JSON.stringify({ id: userId, fullName: fullname, role: role , status: 'ONLINE' })
    );
    document.querySelector('#connected-user-fullname').textContent = `${fullname} (${role})`;
    findAndDisplayConnectedUsers();
}

async function findAndDisplayConnectedUsers() {
    try {
        const response = await fetch('/users'); // Fetch all users
        let users = await response.json();
        const connectedUsersList = document.getElementById('connectedUsers');
        connectedUsersList.innerHTML = '';

        if (role === "MANAGER") {
            // Managers see only their assigned customers
            const manager = users.find(user => user.id === userId);
            if (manager) {
                users = users.filter(user => manager.assignedCustomers.includes(user.id));
            } else {
                users = [];
            }
        } else if (role === "CUSTOMER") {
            // Customers see only their assigned manager
            const customer = users.find(user => user.id === userId);
            if (customer && customer.assignedManagerId) {
                users = users.filter(user => user.id === customer.assignedManagerId);
            } else {
                users = [];
            }
        }

        users.forEach(user => {
            appendUserElement(user, connectedUsersList);
        });
    } catch (error) {
        console.error("Error fetching connected users:", error);
    }
}





function appendUserElement(user, connectedUsersList) {
    const listItem = document.createElement('li');
    listItem.classList.add('user-item');
    listItem.id = user.id;

    const userImage = document.createElement('img');
    userImage.src = '../img/user_icon.png';
    userImage.alt = user.fullName;

    const usernameSpan = document.createElement('span');
    usernameSpan.textContent = `${user.fullName} (${user.role})`;
   

    const receivedMsgs = document.createElement('span');
    receivedMsgs.textContent = '0';
    receivedMsgs.classList.add('nbr-msg', 'hidden');

    listItem.appendChild(userImage);
    listItem.appendChild(usernameSpan);
    listItem.appendChild(receivedMsgs);

    listItem.addEventListener('click', userItemClick);
    connectedUsersList.appendChild(listItem);
}

function userItemClick(event) {
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    messageForm.classList.remove('hidden');

    const clickedUser = event.currentTarget;
    clickedUser.classList.add('active');

    selectedUserId = clickedUser.getAttribute('id');
    fetchAndDisplayUserChat();

    const nbrMsg = clickedUser.querySelector('.nbr-msg');
    nbrMsg.classList.add('hidden');
    nbrMsg.textContent = '0';
}

function displayMessage(senderId, content) {
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message');
    if (senderId === userId) {
        messageContainer.classList.add('sender');
    } else {
        messageContainer.classList.add('receiver');
    }
    const message = document.createElement('p');
    message.textContent = content;
    messageContainer.appendChild(message);
    chatArea.appendChild(messageContainer);
}

async function fetchAndDisplayUserChat() {
    const response = await fetch(`/messages/${userId}/${selectedUserId}`);
    const chatData = await response.json();
    chatArea.innerHTML = '';

    chatData.forEach(chat => {
        displayMessage(chat.senderId, chat.content);
    });
    chatArea.scrollTop = chatArea.scrollHeight;
}

function onError() {
    console.error('Could not connect to WebSocket server.');
}

function sendMessage(event) {
    const messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        const chatMessage = {
            senderId: userId,
            recipientId: selectedUserId,
            content: messageContent,
            timestamp: new Date()
        };
        stompClient.send("/app/chat", {}, JSON.stringify(chatMessage));
        displayMessage(userId, messageContent);
        messageInput.value = '';
    }
    chatArea.scrollTop = chatArea.scrollHeight;
    event.preventDefault();
}

async function onMessageReceived(payload) {
    await findAndDisplayConnectedUsers();
    const message = JSON.parse(payload.body);
    if (selectedUserId === message.senderId) {
        displayMessage(message.senderId, message.content);
        chatArea.scrollTop = chatArea.scrollHeight;
    }

    const notifiedUser = document.getElementById(message.senderId);

    if (notifiedUser && !notifiedUser.classList.contains('active')) {
    const nbrMsg = notifiedUser.querySelector('.nbr-msg');
    nbrMsg.classList.remove('hidden');
    nbrMsg.textContent = '!';
}
}

function onLogout() {
    stompClient.send("/app/user.disconnectUser",
        {},
        JSON.stringify({ id: userId, fullName: fullname, status: 'OFFLINE' })
    );
    window.location.reload();
}

usernameForm.addEventListener('submit', connect);
messageForm.addEventListener('submit', sendMessage);
logout.addEventListener('click', onLogout);
window.onbeforeunload = () => onLogout();


const API_URL = "/chat";
const SERVER_URL = "/health";
const RESET_URL = "/reset";

// Create or retrieve this browser's session ID.
function getSessionId() {
    let sessionId = localStorage.getItem("foodie_session_id");

    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("foodie_session_id", sessionId);
    }

    return sessionId;
}

const sessionId = getSessionId();

// HTML ELEMENTS
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const messages = document.getElementById("messages");
const chatArea = document.getElementById("chatArea");
const welcomeScreen = document.getElementById("welcomeScreen");
const typingIndicator = document.getElementById("typingIndicator");
const sendButton = document.getElementById("sendButton");
const newChatBtn = document.getElementById("newChatBtn");
const headerStatus = document.getElementById("headerStatus");
const searchInput = document.getElementById("searchInput");
const conversationPreview = document.getElementById("conversationPreview");

let isSending = false;

// CHECK BACKEND CONNECTION
async function checkConnection() {
    try {
        const response = await fetch(SERVER_URL);

        if (!response.ok) {
            throw new Error("Server unavailable");
        }

        headerStatus.textContent = "Active now";
        headerStatus.style.color = "#55c982";

    } catch (error) {
        headerStatus.textContent = "Server unavailable";
        headerStatus.style.color = "#ed4956";

        console.error("Connection error:", error);
    }
}

checkConnection();

// GET CURRENT TIME
function getTime() {
    return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// SCROLL TO BOTTOM
function scrollToBottom() {
    chatArea.scrollTo({
        top: chatArea.scrollHeight,
        behavior: "smooth"
    });
}

// CREATE MESSAGE
function addMessage(content, sender) {
    welcomeScreen.style.display = "none";

    const row = document.createElement("div");
    row.className = `message-row ${sender}`;

    if (sender === "bot") {
        const avatar = document.createElement("div");
        avatar.className = "bot-avatar";
        avatar.textContent = "F";
        row.appendChild(avatar);
    }

    const messageContent = document.createElement("div");
    messageContent.className = "message-content";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // Prevent HTML injection.
    bubble.textContent = content;

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = getTime();

    messageContent.appendChild(bubble);
    messageContent.appendChild(time);

    row.appendChild(messageContent);
    messages.appendChild(row);

    scrollToBottom();
}

// SHOW TYPING ANIMATION
function showTyping(show) {
    typingIndicator.style.display = show ? "flex" : "none";
    scrollToBottom();
}

// SEND MESSAGE TO BACKEND
async function sendMessage(message) {
    if (isSending || !message.trim()) {
        return;
    }

    isSending = true;
    sendButton.disabled = true;

    addMessage(message, "user");
    conversationPreview.textContent = message;

    showTyping(true);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
                "X-Session-Id": sessionId
            },
            body: message
        });

        const reply = await response.text();

        if (!response.ok) {
            throw new Error(reply || "Something went wrong.");
        }

        if (!reply.trim()) {
            throw new Error("The assistant returned an empty response.");
        }

        addMessage(reply, "bot");
        conversationPreview.textContent = reply;

    } catch (error) {
        addMessage(
            `Sorry, I couldn't process your request. ${error.message}`,
            "bot"
        );

        console.error("Chat error:", error);

    } finally {
        showTyping(false);
        isSending = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// FORM SUBMISSION
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message || isSending) {
        return;
    }

    messageInput.value = "";
    messageInput.style.height = "auto";

    sendMessage(message);
});

// ENTER TO SEND, SHIFT + ENTER FOR NEW LINE
messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

// AUTO RESIZE TEXTAREA
messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 130) + "px";
});

// SUGGESTED QUESTIONS
document.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
        const message = card.dataset.message;

        if (!isSending && message) {
            sendMessage(message);
        }
    });
});

// NEW CONVERSATION
newChatBtn.addEventListener("click", async () => {
    if (isSending) {
        return;
    }

    newChatBtn.disabled = true;

    try {
        const response = await fetch(RESET_URL, {
            method: "POST",
            headers: {
                "X-Session-Id": sessionId
            }
        });

        if (!response.ok) {
            throw new Error("Could not reset conversation.");
        }

        messages.replaceChildren();
        welcomeScreen.style.display = "block";

        messageInput.value = "";
        messageInput.style.height = "auto";

        conversationPreview.textContent = "Start a conversation...";
        searchInput.value = "";

        messageInput.focus();

    } catch (error) {
        console.error("Reset error:", error);

        alert(
            "Unable to start a new conversation. Please try again."
        );

    } finally {
        newChatBtn.disabled = false;
    }
});

// SEARCH CONVERSATION
searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase().trim();
    const conversation = document.querySelector(".conversation");

    const conversationText = conversation.textContent.toLowerCase();

    conversation.style.display =
        conversationText.includes(query) ? "flex" : "none";
});

# 🎙️ Aura Skincare - AI Voice Customer Support Agent

A browser-based AI voice customer support agent built for **Aura Skincare**, a fictional premium organic Indian skincare brand.

The application allows customers to speak naturally with **Aria**, an AI customer support specialist, using their microphone. Aria can answer customer support questions, look up order information, explain policies, handle eligible order actions, and provide a structured call summary after the conversation.

## 🚀 Live Demo

**Live Application:**  
https://aura-voice-agent-psi.vercel.app/

**GitHub Repository:**  
https://github.com/Virajkamble632/aura-voice-agent

---

## ✨ Features

- 🎙️ Real-time voice conversation
- 🤖 AI-powered customer support using Groq
- 🗣️ Speech-to-Text using Deepgram
- 🔊 Text-to-Speech using Inworld
- ⚡ Real-time audio communication using LiveKit
- 📦 Live order lookup
- 🧾 Order tracking
- ❌ Order cancellation handling
- 🔄 Return and refund policy handling
- 📸 Damaged/defective product policy handling
- 🛡️ Customer-support guardrails
- 📝 Live conversation transcript
- 📊 Structured post-call summary
- 🎧 Listening / Thinking / Speaking states
- 📱 Responsive browser-based interface

---

# 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      Customer       │
                    │    Browser + Mic    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      LiveKit        │
                    │   Real-time Audio   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Aura Agent      │
                    │       Aria          │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌──────────┐     ┌──────────┐    ┌──────────┐
        │ Deepgram │     │   Groq   │    │ Inworld  │
        │   STT    │     │   LLM    │    │   TTS    │
        └──────────┘     └────┬─────┘    └──────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Order Tool    │
                     │get_order_details│
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Orders Dataset │
                     └─────────────────┘
```

# 🔄 How It Works

When the customer starts a call:

1. The browser requests a LiveKit access token from the backend.
2. The customer joins a LiveKit room.
3. LiveKit dispatches the `aura-agent`.
4. The Agent connects to the room.
5. The customer's microphone audio is received by the Agent.
6. Deepgram converts speech into text.
7. The Groq LLM understands the customer's request.
8. If an order is required, the Agent calls `get_order_details(order_id)`.
9. The Agent generates a response according to Aura Skincare's policies.
10. Inworld converts the response into speech.
11. The response is sent back to the customer through LiveKit.
12. After the call, the application generates a transcript and structured summary.

# 🧠 AI Agent

The application uses an AI Agent named **Aria**.

Aria acts as a:

> Friendly, professional and concise Indian customer support specialist for Aura Skincare.

The Agent is responsible for coordinating the complete voice conversation.

### Agent Responsibilities

- Understand customer speech
- Maintain conversation context
- Answer Aura-related questions
- Follow customer-support policies
- Call order lookup tools
- Avoid making up order information
- Handle unclear or missing information
- Generate natural voice responses

# 🛠️ Technology Stack

## Frontend

- React
- Vite
- JavaScript
- CSS
- LiveKit Client
- LiveKit React Components
- Lucide React

## Backend

- Node.js
- Express.js
- CORS
- LiveKit Server SDK

## AI / Voice

- LiveKit
- Deepgram Nova-3 - Speech-to-Text
- Groq - LLM
- GPT-OSS 120B
- Inworld TTS-2 - Text-to-Speech
- Silero VAD

# 📦 Order Lookup Tool

The Agent can use the following tool:

```text
get_order_details(order_id)
```

The tool retrieves order information from the application's order dataset.

### Available Test Orders

| Order ID | Customer | Product | Status |
|---|---|---|---|
| ORD-101 | Priya Sharma | Vitamin C Serum (30ml) | Out for Delivery |
| ORD-102 | Rahul Verma | Hydrating Sunscreen SPF 50 | Delivered |
| ORD-103 | Ananya Patel | Green Tea Face Wash + Toner | Processing |

### Example

Customer:

> "Where is my order ORD-101?"

Aria can retrieve the order details and respond with the delivery status and expected delivery information.

# 🛡️ Customer Support Policies

The Agent follows the Aura Skincare policies defined for the assignment.

### Shipping

- Free shipping for orders above ₹499
- ₹50 shipping for orders of ₹499 or below
- Standard delivery: 3-5 business days

### Returns

Returns are accepted within:

- 7 days of delivery
- Product must be unopened
- Product must be unused
- Original packaging must be available

### Damaged / Defective Products

Customers must report the issue:

- Within 48 hours
- With photos of the damaged/defective product

Eligible cases can be considered for replacement.

### Cancellation

Cancellation is allowed only while an order is:

```text
Processing
```

Orders that are:

```text
Shipped
Out for Delivery
```

cannot be cancelled.

For an out-for-delivery order, the customer can refuse the package at the doorstep.

### Cash on Delivery

COD is available up to:

```text
₹2,500
```

Customers can pay using:

- Cash
- UPI

# 🛡️ AI Guardrails

The Agent is designed to avoid hallucinating information and to stay within the Aura Skincare support domain.

### Example 1 - Invalid Return Request

If a customer asks for a return outside the allowed policy period, Aria explains that the request is outside the return policy.

### Example 2 - Unrelated Question

If the customer asks:

> "Can you book a flight to Goa?"

Aria explains that she can only help with Aura Skincare-related requests.

### Example 3 - Missing Order ID

If the customer asks about an order but does not provide a valid order ID, Aria asks the customer to provide or repeat the order ID instead of inventing information.

### Example 4 - Unclear Audio

If the customer's speech is unclear, Aria asks the customer to repeat the request.

# 📝 Call Transcript & Summary

After the call ends, the application displays:

- Chronological conversation transcript
- Customer intent
- Order ID
- Resolution status
- Call summary

Example:

```json
{
  "customer_intent": "ORDER_TRACKING",
  "order_id": "ORD-101",
  "resolution_status": "RESOLVED",
  "call_summary": "Customer asked about the delivery status of ORD-101. The order is out for delivery and expected by 6 PM today."
}
```

# 📁 Project Structure

```text
aura-voice-agent/
│
├── client/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── server/
│   ├── agent/
│   │   └── auraAgent.js
│   │
│   ├── data/
│   │   └── orders.js
│   │
│   ├── services/
│   │   ├── orderService.js
│   │   └── aiTools.js
│   │
│   ├── routes/
│   │   └── livekit.routes.js
│   │
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── README.md
└── .gitignore
```

# ⚙️ Local Setup

## 1. Clone the Repository

```bash
git clone https://github.com/Virajkamble632/aura-voice-agent.git
```

```bash
cd aura-voice-agent
```

## 2. Install Frontend Dependencies

```bash
cd client
npm install
```

## 3. Install Backend Dependencies

```bash
cd ../server
pnpm install
```

or:

```bash
npm install
```

# 🔐 Environment Variables

Create a `.env` file inside the `server` directory.

```env
PORT=5000

CLIENT_URL=http://localhost:5173

LIVEKIT_URL=your_livekit_url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

GROQ_API_KEY=your_groq_api_key
```

### Important

Never commit the `.env` file or API keys to GitHub.

Use `.env.example` for sharing the required environment variable names.

# ▶️ Run the Application Locally

## Start Backend

```bash
cd server
npm run server
```

or:

```bash
npm run dev
```

## Start Frontend

Open another terminal:

```bash
cd client
npm run dev
```

Then open the local Vite URL shown in the terminal.

# ☁️ Deployment

The frontend is deployed as a public web application.

The AI Agent is deployed separately because the Agent must be running to process the real-time voice conversation.

### Frontend

```text
Vercel
```

### Voice Infrastructure

```text
LiveKit Cloud
```

### AI Voice Pipeline

```text
LiveKit
   ↓
Aura Agent
   ↓
Deepgram
   ↓
Groq
   ↓
Inworld TTS
```

This separation allows the browser application, backend API, LiveKit infrastructure and AI Agent to perform their respective responsibilities.

# 🧪 Testing

The following scenarios can be tested from the live application.

### Test 1 - Order Tracking

Say:

> "Where is my order ORD-101?"

Expected:

- Order found
- Status: Out for Delivery
- Expected delivery information provided

### Test 2 - Order Cancellation

Say:

> "I want to cancel order ORD-103."

Expected:

- Order is Processing
- Cancellation is allowed

### Test 3 - Invalid Cancellation

Ask to cancel:

> "ORD-101"

Expected:

- Cancellation is not allowed because the order is already out for delivery.

### Test 4 - Return Policy

Ask about returning a delivered product.

Expected:

- Aria explains the 7-day return policy and conditions.

### Test 5 - Unclear Order

Say:

> "I want to check my order."

Expected:

- Aria asks for the order ID.

### Test 6 - Unrelated Request

Say:

> "Book me a flight to Goa."

Expected:

- Aria stays within the Aura Skincare support domain.

### Test 7 - Multiple Requests

Ask about more than one order during the same conversation.

Expected:

- Aria handles each request using the appropriate order information and maintains conversation context.

# 🧩 Why This Architecture?

I chose a modular voice-agent architecture because each component has a clear responsibility.

### LiveKit

Handles real-time audio communication between the browser and the AI Agent.

### Deepgram

Converts customer speech into text.

### Groq

Provides the LLM used for understanding customer requests and generating responses.

### Order Tool

Provides structured order information to the Agent instead of allowing the LLM to invent order details.

### Inworld

Converts the AI response into natural speech.

### Express Backend

Handles API endpoints and generates secure LiveKit access tokens.

This separation also makes individual components easier to replace or scale.

# 🧠 Hardest Part

The hardest part was connecting the complete real-time voice pipeline reliably.

The application needs multiple systems to work together:

```text
Browser Microphone
        ↓
LiveKit
        ↓
AI Agent
        ↓
Speech-to-Text
        ↓
LLM
        ↓
Tool Calling
        ↓
Text-to-Speech
        ↓
LiveKit
        ↓
Browser
```

Another important challenge was making sure the Agent follows the predefined customer-support policies instead of generating unsupported information.

# 🚀 What I Would Improve With One More Week

With another week, I would focus on:

- Persistent conversation storage
- Better transcript handling
- More robust order and customer data storage
- Improved error recovery for speech recognition
- Better interruption handling
- More detailed analytics
- Authentication for customer sessions
- Automated voice-agent testing
- Better monitoring and logging
- More comprehensive test coverage

# 📈 What Changes at 1,000 Conversations Per Day?

At approximately 1,000 conversations per day, I would focus on scalability and reliability.

### Improvements would include:

- Horizontal scaling of Agent workers
- Multiple LiveKit Agent instances
- Queue-based background processing where appropriate
- Persistent database for conversations
- Centralized logging
- Monitoring and alerting
- Rate limiting
- API usage monitoring
- Caching frequently accessed data
- Better error handling and retry mechanisms

The architecture would remain modular so individual components could scale independently.

# 🔒 Security

- API keys are stored in environment variables.
- Secrets are not exposed in the frontend.
- LiveKit access tokens are generated by the backend.
- `.env` files are excluded from Git.
- The frontend does not directly receive private API credentials.

# 👨‍💻 Author

**Viraj Kamble**

Full Stack Web Developer

GitHub:  
https://github.com/Virajkamble632

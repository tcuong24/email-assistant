# EmailFlow AI - AI-Powered Event-Driven Email Assistant

EmailFlow AI is an intelligent, real-time, event-driven email management platform. Built on a modern microservices architecture, the application connects to users' actual mailboxes (via the Nylas API), runs asynchronous email intelligence analysis using Google Gemini, and delivers real-time notifications to a responsive dashboard.

---

## 🏗️ System Architecture

The following diagram illustrates the interaction between the frontend, backend microservices, message broker, databases, and third-party APIs:

```mermaid
graph TD
    User([User / Client Browser]) <-->|HTTPS / WebSockets| FE["React Frontend (Port 3000)"]
    FE <-->|API Gateway (Port 8080)| GW["Gateway Service"]
    
    GW --> US["User Service (Port 8082)"]
    GW --> ES["Email Service (Port 8084)"]
    GW --> AS["Analytics Service (Port 8083)"]
    
    US -->|JDBC| DB[(PostgreSQL)]
    ES -->|JDBC| DB
    AS -->|JDBC| DB
    
    Nylas["Nylas API v3 (OAuth & Webhooks)"] <--> ES
    
    ES -->|Produce: email.received| Kafka["Apache Kafka (KRaft)"]
    Kafka -->|Consume: email.received| AI["AI Service (Python, Port 8085)"]
    AI <-->|API Requests| Gemini["Google Gemini Pro"]
    AI -->|Produce: ai.result| Kafka
    Kafka -->|Consume: ai.result| ES
    Kafka -->|Consume: email events| AS
    
    ES -.->|WebSocket / STOMP| FE
```

---

## 🌟 Key Features

- **Real-Time Synchronization:** Secure authorization using Nylas API v3 (OAuth) and real-time webhook ingestion to keep emails in sync with providers (Gmail, Outlook, etc.).
- **Google Gemini Integration:** Automatic processing of incoming emails to perform multi-task analyses:
  - **Category Classification:** Sorting emails into Inbox, Work, Personal, Marketing, Finance, Spam, etc.
  - **Sentiment Analysis:** Classifying mail tone (Positive, Neutral, Negative).
  - **Key Action Items:** Extracting urgent tasks and summaries.
  - **Smart Reply Drafts:** Generating tailored response suggestions based on email context.
- **Event-Driven Communication:** Utilizing **Apache Kafka** to decouple high-load workflows (like third-party API processing and AI analysis) from client response threads.
- **Real-Time Client Updates:** Leverages **WebSockets (STOMP/SockJS)** to push Gemini analysis results and sync status updates directly to the frontend without manual refreshing.
- **Unified Analytics Dashboard:** Rich charts displaying metrics on email volume, sentiment trends, and categorized distribution over time.

---

## 🛠️ Technology Stack

### Frontend (`email-assistant-ui`)
- **Framework:** React 19 + TypeScript + Vite
- **Styling:** Tailwind CSS 4 + Shadcn UI + Framer Motion (for fluid transitions)
- **State & Data Fetching:** TanStack React Query + Axios
- **Real-Time Communication:** `@stomp/stompjs` + `sockjs-client`
- **Charts:** Recharts

### Backend Services (Java & Python)
- **API Gateway:** Spring Cloud Gateway (Java 21)
- **User Service:** Spring Boot (Java 17), PostgreSQL, Spring Security, JWT auth
- **Email Service:** Spring Boot (Java 21), PostgreSQL, Nylas API Client, Spring Kafka, Spring WebSocket
- **Analytics Service:** Spring Boot (Java 21), PostgreSQL, Spring Kafka
- **AI Service:** Python (FastAPI), Google GenAI SDK (Gemini Pro), Kafka-Python

### Infrastructure & DevOps
- **Message Broker:** Apache Kafka (KRaft Mode)
- **Database:** PostgreSQL 16 (Multi-database architecture for isolation)
- **Deployment:** Docker & Docker Compose

---

## 📂 Project Structure

```text
email-assistant/
├── gateway-service/       # API Gateway routing and request filtering
├── user-service/          # Account registration, login, and JWT auth
├── email-service/         # Nylas integration, WebSocket server, email CRUD operations
├── analytics-service/     # Aggregates email usage metrics and telemetry
├── ai-service/            # Python background workers handling Gemini processing
├── email-assistant-ui/    # React frontend client dashboard
├── docker-compose.yml     # Infrastructure setup (Kafka, Postgres, all services)
└── README.md              # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Docker & Docker Desktop](https://www.docker.com/)
- [Java Development Kit (JDK 21)](https://adoptium.net/) (for local backend development)
- [Node.js (v18+) & npm](https://nodejs.org/) (for local frontend development)
- Google Gemini API Key
- Nylas Developer Credentials (Client ID, Client Secret, API Key)

### Configuration
Create a `.env` file in the root directory and specify the required credentials:
```env
# Gemini Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Nylas Configuration
NYLAS_CLIENT_ID=your_nylas_client_id_here
NYLAS_API_KEY=your_nylas_api_key_here
NYLAS_API_URL=https://api.us.nylas.com
```

### Launching the Application
You can spin up the entire application stack including databases, Kafka, all backend services, and the frontend UI using Docker Compose:

1. Build and run all services in detached mode:
   ```bash
   docker-compose up --build -d
   ```
2. Access the application:
   - **Frontend UI:** `http://localhost:3000`
   - **API Gateway:** `http://localhost:8080`
   - **Kafka Control Center (if exposed):** Port `9092`

### Database Management
On the first startup, PostgreSQL will automatically run the schema initializations located in `./docker-postgres-init`. The user data, emails, and analytics events are persisted in separated logical databases inside the container.

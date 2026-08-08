<div align="center">

# ⟁ CampuSync

<img src="https://readme-typing-svg.demolab.com?font=Plus+Jakarta+Sans&weight=700&size=28&pause=1000&color=00F5A0&center=true&vCenter=true&width=750&lines=Campus+%26+Hostel+Management+Platform;FastAPI+Python+Microservices+Architecture;AI-Powered+Lost+%26+Found+with+Gemini+Vision;Kafka-Driven+Event-Driven+Notifications;Gender-Segregated+Hostel+Privacy+Filters" alt="CampuSync Banner" />

### 🚀 Next-Gen Campus & Hostel Management Platform built with FastAPI, React 18, PostgreSQL, Firebase Auth, Apache Kafka & Docker

<p>
  <a href="https://campusync.tech/"><img src="https://img.shields.io/badge/Live_Production-https%3A%2F%2Fcampusync.tech-00F5A0?style=for-the-badge&logo=nginx&logoColor=white"></a>
  <img src="https://img.shields.io/badge/SSL%2FTLS-HTTPS_Secure-00D4FF?style=for-the-badge&logo=letsencrypt&logoColor=white">
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/React_18-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/PostgreSQL-Multi_DB-336791?style=for-the-badge&logo=postgresql&logoColor=white">
  <img src="https://img.shields.io/badge/Firebase-Auth_RBAC-FFCA28?style=for-the-badge&logo=firebase&logoColor=black">
  <img src="https://img.shields.io/badge/Kafka-Event_Driven-231F20?style=for-the-badge&logo=apachekafka&logoColor=white">
  <img src="https://img.shields.io/badge/AI-Google_Gemini-8E44AD?style=for-the-badge&logo=googlegemini&logoColor=white">
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white">
</p>

</div>

---

## 🌟 Overview

**CampuSync** is an enterprise-grade **Campus & Hostel Management Ecosystem** engineered using a decoupled **FastAPI Microservices Architecture**. It digitizes hostel complaints, automates maintenance worker job allocation, provides an AI-vision-powered Lost & Found engine, and enforces gender-segregated privacy filters for hostel residents.

🔒 **Live Production Site**: [https://campusync.tech](https://campusync.tech) *(Secured with HTTPS & Nginx Reverse Proxy)*

---

## ✨ Key Platform Features

### 🔐 1. Firebase Authentication & Granular RBAC
- **Token Verification**: Custom JWT middleware validating Firebase ID tokens across all microservices.
- **Three Distinct System Roles**:
  - 🎓 **STUDENT** (Hostel Resident vs Day Scholar / College Student)
  - 🛠️ **WORKER** (Maintenance Technicians with specialized skill sets & workload caps)
  - 👨‍💼 **ADMIN** (System Managers with full user & role management capabilities)

---

### 🔍 2. AI-Powered Lost & Found Engine
- **Google Gemini 1.5 Vision AI**: Automated image tag generation and multi-item visual similarity matching.
- **Location Context Selection**: Reporters specify where an item was lost or found (**🏫 College Campus** vs **🏠 Hostel Area**).
- **Gender-Segregated Hostel Privacy Filters**:
  - 👦 **Hostel Male Students**: View only `Hostel Male` items + universal `College Campus` items.
  - 👧 **Hostel Female Students**: View only `Hostel Female` items + universal `College Campus` items.
  - 🏫 **Day Scholar (College) Students**: View universal `College Campus` items with classroom location details.
- **Safe Claim Contact**: Replaces raw email display with a secure *"I think this is mine! 📞"* contact pop-up.

---

### ⚡ 3. Intelligent Complaint Management & Worker Dispatch
- **Skill-Based Auto-Assignment**: Complaints are automatically assigned to available workers matching the required work type (`Electrical`, `Plumbing`, `Cleaning`, `AC Repair`, `Carpentry`, `Painting`, `Pest Control`, `General Maintenance`).
- **Workload Capacity Engine**: Enforces max active complaint limits per worker to prevent technician burn-out.
- **Retroactive Task Assignment**: When a worker registers or updates their capacity, unassigned queue complaints are automatically assigned.

---

### 📢 4. Event-Driven Kafka Messaging System
- **Asynchronous Event Pipeline**: Apache Kafka event producer/consumer decouples complaint status changes and AI match alerts.
- **Real-Time Notifications**: Instant updates delivered to student and worker dashboards.

---

## 🏗️ Microservices Architecture

CampuSync implements a strict **Database-per-Service Architecture** inside Docker containers, managed via `docker-compose`.

```text
📦 CampuSync Ecosystem
├── 🌐 Nginx Reverse Proxy (Ports 80 / 443 SSL/TLS)
│   └── Certificate mounting, HTTPS redirection & API routing
│
├── 🎨 Frontend Service (React 18 + Vite)
│   └── Ocean Glassmorphism UI, Responsive Mobile Bottom Navigation
│
├── 🔐 Auth Microservice (FastAPI - Port 8081)
│   ├── Database: hostelhub_auth (PostgreSQL)
│   └── Profile sync, gender & student type tracking, RBAC role management
│
├── ⚡ Complaint Microservice (FastAPI - Port 8082)
│   ├── Database: hostelhub_complaint (PostgreSQL)
│   └── Complaint engine, capacity-aware worker dispatcher, Kafka producer
│
├── 🤖 Lost & Found Microservice (FastAPI - Port 8083)
│   ├── Database: hostelhub_lostfound (PostgreSQL)
│   └── Gemini Vision AI tagger, location context & gender filter engine
│
├── 📢 Notification Microservice (FastAPI - Port 8084)
│   ├── Database: hostelhub_notifications (PostgreSQL)
│   └── Apache Kafka Consumer & real-time notification broadcaster
│
└── 🐘 Infrastructure Containers
    ├── PostgreSQL (Multi-database container)
    └── Apache Kafka & Zookeeper Cluster
```

---

## 🛠️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Frontend UI** | React 18, Vite, Vanilla CSS (Custom Ocean Glassmorphism), Context API, Axios |
| **Backend API** | Python 3.10+, **FastAPI**, Uvicorn, Pydantic v2, SQLAlchemy 2.0 |
| **Databases** | PostgreSQL (4 isolated databases per microservice) |
| **Authentication** | Firebase Admin SDK, JWT Token Interceptors, Role-Based Access Control |
| **AI / Computer Vision**| Google Gemini 1.5 Vision API |
| **Message Broker** | Apache Kafka, Zookeeper |
| **DevOps & Proxy** | Docker, Docker Compose, Nginx, Let's Encrypt SSL/TLS, DuckDNS |

---

## 🖼️ Dashboard Showcase & User Experiences

### 👨‍💼 1. Admin Dashboard
> Provides system-wide user role management (Promote/Demote between Student, Worker, and Admin), real-time service health telemetry, and global complaint metrics.

<p align="center">
  <img width="1907" height="988" alt="image" src="https://github.com/user-attachments/assets/6ea3756c-5a97-4610-889e-b30501839eee" />

</p>

---

### 🎓 2. Student Dashboard
> Allows students to file complaints, report lost & found items with location context, filter items by gender & campus area, and safely contact item finders.

<p align="center">
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/79f856ec-40d6-4604-adfa-d09d15605e87" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/5338c4c7-f7cf-4677-957a-8dfa9d5a005b" />

</p>

---

### 🛠️ 3. Worker Dashboard
> Dedicated maintenance console for technicians to view assigned complaints based on work category specialization, monitor workload limits, and update task progress.

<p align="center">
  <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/cb66799a-1fb4-4929-9f8e-ed6a4231cb8e" />

</p>

---

## 🚦 Local Setup & Deployment Guide

### Prerequisites
- Docker Engine & Docker Compose
- Firebase Project Credentials (`firebase-service-account.json`)
- Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/yashvanthbalaji/campusync-python-fullstack.git
cd campusync-python-fullstack
```

### 2. Environment Configuration
Create `.env` files in each service directory containing your database URLs, Firebase parameters, and Gemini API keys.

### 3. Launch with Docker Compose
```bash
docker compose up -d --build
```

### 4. Access the Microservices
- **Frontend App**: `http://localhost` or `https://campusync.tech`
- **Auth Service**: `http://localhost:8081/docs`
- **Complaint Service**: `http://localhost:8082/docs`
- **Lost & Found Service**: `http://localhost:8083/docs`
- **Notification Service**: `http://localhost:8084/docs`

---

## 👨‍💻 Developer & Author

**Yashvanth Balaji**  
*Python Full-Stack & Microservices Engineer*  
💻 Python • FastAPI • React • PostgreSQL • Kafka • Firebase • Docker • Cloud Architecture

---

<div align="center">

### ⭐ Star this repository if you find it helpful!

*Building high-performance, event-driven microservices for smart campuses.*

</div>

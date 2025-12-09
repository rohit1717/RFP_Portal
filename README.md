# AI-Powered RFP Management System

An end-to-end single-user web application that automates the complete Request for Proposal (RFP) workflow using AI. It allows a procurement manager to create structured RFPs from natural language, manage vendors, send RFPs via email, automatically parse vendor responses with AI, and compare proposals with AI-assisted recommendations.

---

## 1. Project Overview

Procurement teams often struggle with manual RFP processes involving unstructured emails, documents, and repetitive evaluations. This project demonstrates how AI can streamline this entire process:

- Natural language → structured RFP  
- Vendor selection & automated email sending  
- Automatic inbound email processing  
- AI-based vendor proposal extraction  
- AI-based comparison & recommendation  

This is a **single-user system** focused on simplicity, automation, and clear decision-making.

---

## 2. Key Features

✅ Create structured RFPs from natural language  
✅ Vendor management (add, list, select vendors)  
✅ Send RFPs via real email (SMTP)  
✅ Receive vendor replies automatically (IMAP)  
✅ AI-powered proposal extraction  
✅ AI-powered comparison & scoring  
✅ AI-generated recommendations with rationale  

---

## 3. Tech Stack

### Frontend
- React
- TypeScript
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript

### Database
- MongoDB (Mongoose ODM)

### AI Provider
- OpenAI / Groq (LLaMA 3.1)

### Email Integration
- Nodemailer (SMTP)
- node-imap (IMAP inbound email processing)

---

## 4. System Architecture

Frontend (React UI)
        │
        ▼
Backend (Express API)
        │
        ├── RFP Service
        ├── Vendor Service
        ├── Proposal Service
        ├── AI Parsing & Comparison
        ├── SMTP Mail Sender
        └── IMAP Mail Watcher
                   │
                   ▼
           Vendor Email Replies
                   │
                   ▼
            AI Parsing → MongoDB

---

## 5. Project Setup

### ✅ Prerequisites

- Node.js v18+
- MongoDB (local or MongoDB Atlas)
- SMTP + IMAP email account
- OpenAI or Groq API key

---

### ✅ Backend Setup

cd backend
npm install

Create `.env` file:

PORT=4000
MONGODB_URI=mongodb://localhost:27017/rfp_db

AI_API_KEY=your_ai_api_key_here

SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_USER=your_email@domain.com
SMTP_PASS=your_password

IMAP_HOST=imap.yourprovider.com
IMAP_PORT=993
IMAP_USER=your_email@domain.com
IMAP_PASS=your_password
IMAP_TLS=true

FROM_EMAIL=your_email@domain.com

Start backend:

npm run dev

---

### ✅ Frontend Setup

cd frontend
npm install
npm run dev

---

## 6. API Overview

POST /api/rfps  
GET  /api/rfps  
GET  /api/rfps/:id  
POST /api/rfps/:id/send  
GET  /api/rfps/:id/comparison  
POST /api/vendors  
GET  /api/vendors  

---

## 7. Data Models (Simplified)

RFP, Vendor, Proposal

---

## 8. AI Integration

Used for:
- RFP generation
- Proposal extraction
- AI-based comparison & recommendations

---

## 9. Email Flow

Outbound: SMTP (Nodemailer)  
Inbound: IMAP Watcher

---

## 10. Demo Video

ADD YOUR VIDEO LINK HERE

---

✅ This project demonstrates a complete real-world AI-powered procurement workflow using real email and AI.

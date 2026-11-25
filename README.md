# Spot4Notes 📚

A centralized academic resource sharing platform exclusively for college students. Upload, discover, and share study materials across 14 departments with AI-powered assistance.

## Project Description

**Spot4Notes** is a comprehensive, AI-enhanced academic resource sharing platform tailored specifically for college students. Designed to streamline the way students discover, upload, and study course materials, the platform provides a centralized hub across 14 distinct academic departments. 

To ensure academic integrity and community safety, Spot4Notes utilizes strict college email domain verification and features an automated content moderation pipeline that scans uploaded documents (PDFs, Word files, and images via OCR) for inappropriate material before they reach an admin approval queue. 

Beyond standard file sharing, Spot4Notes features an integrated AI Study Assistant. This allows students to dynamically generate quizzes, summarize lengthy lecture notes, and interact with an AI tutor directly within the platform. Built with a modern tech stack (React, Tailwind CSS, Node.js, Express, and PostgreSQL), it offers a highly responsive, secure, and user-friendly experience for both students and administrators.

![alt text](<client/images/Mainpage.png>)

## Features

- **College Email Authentication** — Registration restricted to verified college email addresses
- **14 Departments** — AI & DS, Biomedical, Chemical, Civil, CS, CS(AIML), CSBS, Cyber Security, ECE, EEE, IT, Mechanical, Mechatronics, MBA
- **Smart Upload System** — Drag-and-drop file upload with automatic content scanning (PDF, DOCX, images via OCR)
- **Content Moderation** — Automated scanning for inappropriate content + admin approval workflow
- **Advanced Search** — Full-text search with department, category, and subject filters
- **AI Study Assistant** — Chat with AI, generate quizzes, summarize notes (OpenAI-powered with fallback)
- **Admin Dashboard** — Analytics, material approval/rejection, user management
- **Notifications** — Real-time notifications for upload status changes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router v6, Zustand |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt + Email Verification |
| File Processing | pdf-parse, mammoth, tesseract.js |
| AI | OpenAI API (gpt-3.5-turbo) |

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14.x
- **npm** >= 9.x

## Getting Started

### 1. Clone & Install

```bash
git clone <your-repo-url> Spot4Notes
cd Spot4Notes

# Install root dependencies (concurrently)
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
cd ..
```

### 2. Configure Environment

Edit `server/.env` with your settings:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/spot4notes
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
COLLEGE_EMAIL_DOMAIN=kpriet.ac.in
CLIENT_URL=http://localhost:5173

# Email (optional — logs verification URL in dev if not configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@kpriet.ac.in

# AI Chatbot (optional — uses fallback responses if not set)
OPENAI_API_KEY=sk-your-openai-key

# Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=uploads
```

### 3. Setup Database

Create the PostgreSQL database and run migrations + seed:

```bash
# Create database
psql -U postgres -c "CREATE DATABASE spot4notes;"

# Run migrations (creates all tables and indexes)
cd server
npm run migrate

# Seed departments and admin user
npm run seed
```

**Default admin account:** `admin@kpriet.ac.in` / `admin123`

### 4. Run the App

From the project root:

```bash
# Run both client and server concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Backend (port 5000)
cd server
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

## Project Structure

```
Spot4Notes/
├── client/                  # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/      # MainLayout, AdminLayout
│   │   ├── lib/
│   │   │   └── api.js       # Axios API layer
│   │   ├── pages/
│   │   │   ├── admin/       # AdminDashboard, AdminMaterials, AdminUsers
│   │   │   ├── Home.jsx
│   │   │   ├── Materials.jsx
│   │   │   ├── Upload.jsx
│   │   │   ├── Chatbot.jsx
│   │   │   └── ...
│   │   ├── store/
│   │   │   └── authStore.js  # Zustand auth state
│   │   ├── App.jsx           # Routes
│   │   └── main.jsx
│   └── vite.config.js
├── server/                   # Express backend
│   ├── src/
│   │   ├── db/
│   │   │   ├── index.js      # PostgreSQL connection
│   │   │   ├── migrate.js    # Schema migration
│   │   │   └── seed.js       # Department & admin seed
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT auth middleware
│   │   │   └── upload.js     # Multer file upload
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── materials.js
│   │   │   ├── departments.js
│   │   │   ├── admin.js
│   │   │   ├── chatbot.js
│   │   │   └── notifications.js
│   │   ├── services/
│   │   │   └── scanner.js    # Content scanner
│   │   ├── utils/
│   │   │   └── email.js      # Email service
│   │   └── index.js          # Express app entry
│   ├── uploads/              # Uploaded files
│   └── .env
├── package.json              # Root with concurrently
└── README.md
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with college email |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/verify-email` | Verify email token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |

### Materials
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/materials/upload` | Upload material (auth) |
| GET | `/api/materials` | Browse & search materials |
| GET | `/api/materials/:id` | Get material details |
| POST | `/api/materials/:id/download` | Track download |
| GET | `/api/materials/user/my-uploads` | My uploads |
| DELETE | `/api/materials/:id` | Delete own material |

### Departments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/departments` | List all departments |
| GET | `/api/departments/:slug` | Department details + materials |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/analytics` | Dashboard stats |
| GET | `/api/admin/materials` | All materials (filterable) |
| PUT | `/api/admin/materials/:id/approve` | Approve material |
| PUT | `/api/admin/materials/:id/reject` | Reject material |
| GET | `/api/admin/users` | List users |
| PUT | `/api/admin/users/:id/ban` | Ban user |
| PUT | `/api/admin/users/:id/unban` | Unban user |

### AI Chatbot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chatbot/chat` | Send message |
| GET | `/api/chatbot/history` | Chat history |
| POST | `/api/chatbot/quiz` | Generate quiz |
| POST | `/api/chatbot/summarize` | Summarize text |

## Categories

Materials are organized into 5 categories:
- **Notes** — Lecture notes and class notes
- **Question Papers** — Previous exam papers
- **PPTs** — Presentation slides
- **Important Questions** — Curated important questions
- **Study Materials** — Textbooks, references, guides

## License

MIT

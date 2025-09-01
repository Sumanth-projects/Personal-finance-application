# 💸 Finance Tracker: Your Smart Expense Companion

A modern full-stack finance app with AI-powered receipt scanning, built for effortless expense management and beautiful insights.

![Finance Tracker](https://img.shields.io/badge/Version-1.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

[Demo Video](https://drive.google.com/drive/folders/10dIeshRGgCKueH5GGyuvNGcsfYgWeWRR?usp=sharing)

---

## 🚀 What Makes Finance Tracker Special?

### Core Features
- **🔒 Secure Login** – JWT authentication with strong password rules
- **💰 Transaction Control** – Add, edit, filter, and delete transactions with ease
- **📊 Visual Analytics** – Interactive charts for spending, income, and categories
- **🏷️ Custom Categories** – Personalize with colors and icons
- **📱 Mobile-Ready** – Responsive design for any device
- **🌗 Light & Dark Themes** – Auto-detects your system preference

### Advanced Power
- **🧾 Receipt OCR** – Extract data from receipts using AWS Textract & Tesseract
- **🔎 Smart Search** – Filter by date, category, type, and payment method
- **📅 Date Picker** – Analyze history with a month/year selector
- **📄 Fast Pagination** – Handles large datasets smoothly
- **📤 File Uploads** – PNG, JPG, and PDF support
- **✨ Modern UI** – Built with Shadcn UI & Tailwind CSS

---

## 🏗️ Project Overview

```
finance-tracker/
├── backend/                # Node.js/Express API
│   ├── config/             # MongoDB setup
│   ├── controllers/        # Auth, category, transaction, upload logic
│   ├── lib/                # AWS Textract, S3 helpers
│   ├── middleware/         # Auth, error, validation
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── services/           # OCR orchestrators
│   ├── uploads/            # Receipt storage
│   ├── utils/              # Date parsing, cleanup
│   ├── seedData.js         # Demo data
│   ├── server.js           # Express entry
│   └── package.json        # Backend deps
│
├── frontend/finance-app/   # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/            # Pages & layouts
│   │   │   ├── (auth)/     # Login, register
│   │   │   ├── (main)/     # Dashboard, transactions, categories, settings
│   │   │   ├── globals.css # Global styles
│   │   │   ├── layout.tsx  # Root layout
│   │   │   └── page.tsx    # Home page
│   │   ├── components/     # UI & app components
│   │   ├── contexts/       # Auth & theme state
│   │   └── lib/            # API & utils
│   ├── next.config.ts      # Next.js config
│   ├── tailwind.config.js  # Tailwind theme
│   ├── tsconfig.json       # TypeScript config
│   └── package.json        # Frontend deps
│
├── Financial_Tracker_API_Tests.postman_collection.json
├── Financial_Tracker_Environment.postman_environment.json
└── README.md               # This file
```

---

## 🛠️ Tech Stack

### Backend
- **Node.js 18+** – Fast, scalable runtime
- **Express.js** – API framework
- **MongoDB + Mongoose** – Flexible database
- **JWT** – Secure authentication
- **Multer** – File uploads
- **AWS Textract & Tesseract** – OCR engines
- **AWS S3** – Cloud storage
- **Express Validator** – Input validation
- **bcryptjs** – Password hashing

### Frontend
- **Next.js 14** – App Router, SSR
- **TypeScript** – Type safety
- **Tailwind CSS** – Utility-first styling
- **Shadcn UI** – Modern UI components
- **Recharts** – Data visualization
- **Axios** – API requests
- **Lucide React** – Icon set
- **Turbopack** – Fast builds

### Dev Tools
- **Postman** – API testing
- **ESLint** – Code quality
- **Git** – Version control

---

## 📋 Prerequisites

- **Node.js** (v18+) – [Download](https://nodejs.org/)
- **MongoDB** (v6+) – [Download](https://www.mongodb.com/try/download/community) or [Atlas](https://www.mongodb.com/atlas)
- **npm/yarn** – Package manager
- **Git** – [Download](https://git-scm.com/)

### Optional for OCR
- **AWS Account** – For Textract
- **Tesseract OCR** – Local OCR

---

## 🚦 Quick Start

### 1. Clone & Setup
```bash
# Clone repo
$ git clone https://github.com/Shanmukh2307/finance-tracker.git
$ cd finance-tracker
```

### 2. Backend
```bash
$ cd backend
$ npm install
```
Create `.env` in backend:
```env
MONGODB_URI=
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=
PORT=3001
NODE_ENV=development
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=your-region
AWS_S3_BUCKET_NAME=your-s3-bucket-name
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```
Run server:
```bash
$ npm run dev   # Dev mode
$ npm start     # Production
```

### 3. Frontend
```bash
$ cd frontend/finance-app
$ npm install
```
Create `.env.local` in frontend:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_APP_NAME=Finance Tracker
NEXT_PUBLIC_APP_VERSION=1.0.0
```
Run frontend:
```bash
$ npm run dev
```

### 4. Open in Browser
Go to [http://localhost:3000](http://localhost:3000) and start tracking!

---

## 🔧 Configuration

### Backend
- **MongoDB**: Local, Atlas, or Docker
- **OCR**: Tesseract (default) or AWS Textract
- **Uploads**: PNG, JPG, PDF (max 10MB)

### Frontend
- **API Endpoint**: Change `NEXT_PUBLIC_API_URL` if needed
- **Build**:
```bash
$ npm run dev      # Dev
$ npm run build    # Production
$ npm start        # Start
$ npm run lint     # Lint
```

---

## 📊 API Endpoints

- `POST /api/auth/register` – Register
- `POST /api/auth/login` – Login
- `GET /api/auth/me` – Current user
- `GET /api/transactions` – List transactions
- `POST /api/transactions` – Add transaction
- `GET /api/transactions/:id` – Single transaction
- `PUT /api/transactions/:id` – Update
- `DELETE /api/transactions/:id` – Delete
- `GET /api/transactions/stats` – Stats
- `GET /api/categories` – List categories
- `POST /api/categories` – Add category
- `PUT /api/categories/:id` – Update
- `DELETE /api/categories/:id` – Delete
- `POST /api/upload/receipt` – OCR upload

---

## 🙏 Credits

- [Shadcn UI](https://ui.shadcn.com/) – UI components
- [Recharts](https://recharts.org/) – Charts
- [AWS Textract](https://aws.amazon.com/textract/) – OCR
- [Tesseract.js](https://tesseract.projectnaptha.com/) – Local OCR
- [MongoDB](https://www.mongodb.com/) – Database
- [Next.js](https://nextjs.org/) – Frontend




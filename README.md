NexPrep

A job interview preparation platform powered by AI voice agents

NexPrep is a full-stack web application that simulates real-world interview experiences using AI-powered voice agents. Built with Next.js, Firebase, Tailwind CSS, and Vapi AI, the platform allows users to take mock interviews, receive instant AI-generated feedback, and track their progress in an intuitive and responsive interface.



📋 Table of Contents

🤖 Introduction

⚙️ Tech Stack

🔋 Features

🤸 Quick Start

🕸️ Snippets (Code to Copy)

🔗 Assets

🚀 More

🤖 Introduction

NexPrep helps users practice job interviews with AI-driven voice agents, providing personalized feedback and analytics using advanced NLP models like Google Gemini. It’s designed with clean code architecture and built for scalability and real-world use.

⚙️ Tech Stack

Next.js – React framework for full-stack functionality

Firebase – Authentication and real-time data storage

Tailwind CSS – Utility-first styling

Vapi AI – Voice agent API for interactive interviews

shadcn/ui – Reusable UI components

Google Gemini – AI feedback generation

Zod – Type-safe input validation

🔋 Features

🔐 Authentication – Secure sign-up and login via Firebase

🎙️ AI Interview Simulation – Real-time voice-based interviews

🧠 AI Feedback – Google Gemini-based feedback generation

📋 Dashboard – View and manage all your past interviews

💬 Transcripts – Review conversation history and feedback

📱 Responsive Design – Optimized for all devices

⚙️ Clean Architecture – Modular and maintainable codebase

🤸 Quick Start

Prerequisites

Make sure you have the following installed:

Git

Node.js

npm

Clone the Repository

git clone https://github.com/Suraj05654/NexPrep.git
cd nexprep

Install Dependencies

npm install

Set Up Environment Variables

Create a .env.local file in the root directory and add:

NEXT_PUBLIC_VAPI_WEB_TOKEN=
NEXT_PUBLIC_VAPI_WORKFLOW_ID=

GOOGLE_GENERATIVE_AI_API_KEY=

NEXT_PUBLIC_BASE_URL=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

Replace the placeholders with your actual credentials.

Run the Project

npm run dev

Open http://localhost:3000 to view the app.


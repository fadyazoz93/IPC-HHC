# WHO Hand Hygiene Compliance App

A modern, fast web application for recording and analyzing World Health Organization (WHO) Hand Hygiene Compliance observations, built with React, Vite, and Turso SQLite database on Vercel Serverless Functions.

## Features

- **WHO Compliant Observation Form**: Standard 5 Moments for Hand Hygiene recording form.
- **Analytics & Dashboard**: Interactive compliance metrics and breakdown reports.
- **Records Manager**: Full session list, auto duration recalculation, and Copy Month archive feature.
- **Turso SQLite Backend**: High-performance SQLite database connection via Serverless API (`/api`).

## Deployment on Vercel

### Environment Variables

Set the following Environment Variables in your Vercel Project Settings:

- `TURSO_DATABASE_URL` (Your Turso SQLite Database URL)
- `TURSO_AUTH_TOKEN` (Your Turso Auth Token)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```

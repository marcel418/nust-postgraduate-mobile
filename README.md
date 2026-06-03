# NUST Postgraduate Management System

## Project Overview

The NUST Postgraduate Management System is a postgraduate workflow platform for managing student submissions, supervisory reviews, departmental approvals, evaluator feedback, notifications, and administrative oversight. This repository contains the mobile client and the companion backend service used to support the workflow end to end.

## Objectives

- Provide a role-based mobile interface for postgraduate users.
- Support submission, review, approval, and decision-making workflows.
- Keep documents, deadlines, and reporting periods aligned with the active academic semester.
- Improve traceability through notifications, audit logging, and workflow status tracking.
- Offer a submission-ready codebase with clear technical documentation.

## Technology Stack

Frontend:

- React Native
- Expo
- React Navigation

Backend:

- Node.js
- Express

Database:

- PostgreSQL

Infrastructure:

- Docker-ready deployment environment
- Expo development tooling

## System Roles

Student

- Creates and manages submission records.
- Uploads and removes documents while the workflow rules allow it.
- Tracks progress, feedback, and notifications.

Supervisor

- Reviews student submissions and reports.
- Provides feedback and workflow actions where required.

HOD

- Oversees departmental submission workflows.
- Assigns internal evaluators and proposes external evaluators.

FPGC

- Manages academic committee review and assignment processes.

FPGCR

- Handles review confirmation and final decision support.

External Evaluator

- Reviews assigned theses and submits assessment-related actions.

Administrator

- Manages users, semester configuration, notifications, and system settings.

## Workflow Overview

Student -> Supervisor -> HOD -> FPGC -> External Evaluator -> FPGCR -> Final Decision

The implementation also supports internal evaluator and administrative paths where they are required by the institutional workflow.

## Architecture Overview

Frontend structure

- `App.js` boots authentication state and loads the navigation tree.
- `src/navigation/` contains the role-based stack and tab navigation.
- `src/screens/` contains role-specific screens for students, supervisors, HOD, evaluators, FPGC, FPGCR, and administrators.
- `src/components/` contains reusable UI elements such as deadline controls and shared headers.
- `src/api/` and `src/services/` centralize HTTP access and service wrappers.

Backend structure

- `backend/src/server.js` initializes the API server, middleware, routes, and background jobs.
- `backend/src/routes/` contains the resource endpoints for authentication, submissions, notifications, documents, semesters, and users.
- `backend/src/jobs/` contains scheduled workflow tasks such as deadline notifications.
- `backend/src/middleware/` contains authentication protection.

Database structure

- `backend/sql/schema.sql` defines the PostgreSQL schema.
- Core tables cover users, roles, semesters, submissions, submission versions, documents, workflow instances, workflow tasks, workflow transitions, notifications, and audit logs.
- Indexes and foreign keys enforce workflow integrity and improve query performance.

## Installation Guide

### Clone repository

```bash
git clone <repository-url>
cd nust-postgraduate-mobile-develop
```

### Install dependencies

```bash
npm install
cd backend
npm install
cd ..
```

### Environment configuration

- Copy `.env.development` to `.env` for the mobile app if you need a local override.
- Configure the backend environment values in the backend `.env` file, including the PostgreSQL connection settings.
- Set the mobile API base URL so it points to the running backend service.

### Docker setup

- Use your Docker or Docker Compose environment if your deployment workflow runs the backend and PostgreSQL inside containers.
- Ensure the backend container can reach the PostgreSQL service and that the Expo app points to the correct API URL.
- This repository does not include Docker compose files, so use the project-specific container setup provided by your deployment environment.

### Database setup

```bash
cd backend
node scripts/seed.js
```

- Apply the SQL schema in `backend/sql/schema.sql` to your PostgreSQL database before starting the backend.
- Load seed data if you need a pre-populated development environment.

### Running the application

```bash
# Mobile app
npm start

# Backend API
cd backend
npm run dev
```

Use Expo Go or an emulator to open the mobile app after the Expo bundler starts.

## Lecturer Suggestions Implemented

The current `main` and `develop` branch tips resolve to the same application snapshot, so there is no remaining branch-level code delta to merge in this comparison. The improvements below are verified in the codebase and reflected in the current implementation.

- UI/UX improvements: dedicated role screens, consistent role-specific headers, and clearer action grouping improve navigation clarity and reduce cognitive load.
- Design system implementation: shared components such as `AppHeader`, `HODHeader`, `DeadlineExtensionControl`, and status/filter helpers give the app a more consistent visual and interaction model.
- Navigation improvements: the role-aware navigator in `src/navigation/index.js` routes users into dedicated stacks for student, supervisor, HOD, evaluator, external evaluator, FPGC, FPGCR, and admin workflows.
- Workflow improvements: submission handling supports reporting periods, deadline extensions, workflow progress tracking, and role-specific review actions.
- Role-specific enhancements: each role has its own dashboard and task screens, including submission review, evaluator assignment, review reporting, and administrative management.
- Validation improvements: the backend validates date inputs, ownership rules, deadline extension rules, and semester uniqueness before persisting changes.
- Error handling improvements: API routes and screens provide explicit user-facing error messages for failed loads, invalid actions, and forbidden operations.
- Database improvements: the PostgreSQL schema adds workflow instance tables, submission versioning, notification tracking, audit logging, and supporting indexes for faster lookup.
- Performance improvements: indexed submission, workflow-task, and notification columns reduce repeated lookup cost in the busiest workflow paths.

## Repository Structure

- `src/` - mobile application source code, screens, components, navigation, APIs, and utilities.
- `backend/` - API service, database schema, jobs, middleware, and server routes.
- `docs/` - submission documentation and project notes.
- `docs/Technical-Documentation/` - final Word or PDF technical document location.

## Technical Documentation

The final technical document should be placed in `docs/Technical-Documentation/`.

## Team Information

- Student 1: [Add name]
- Student 2: [Add name]
- Student 3: [Add name]
- Student 4: [Add name]

## Notes

- All API calls should go through the shared API client layer.
- Submission and workflow rules are enforced on the backend as well as in the mobile interface.

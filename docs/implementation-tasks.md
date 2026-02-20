# Equipment Reservation - Implementation Tasks

This task list is derived from `docs/implementation-plan.md` and ordered for execution.

## 1) DDD Architecture First
- [x] Create backend folder structure:
  - `src/Equipment/Domain`
  - `src/Reservation/Domain`
  - `src/Reservation/Application`
  - `src/Shared/Infrastructure/Persistence/Doctrine`
  - `src/Reservation/Infrastructure/Http`
- [x] Define architectural boundaries and coding rules:
  - Controllers are thin (HTTP mapping only).
  - Business rules are in Domain/Application layers.
  - Doctrine persistence details stay in Infrastructure.
- [x] Create repository interfaces in Domain:
  - `EquipmentRepositoryInterface`
  - `ReservationRepositoryInterface`
- [x] Create application-level use case contracts:
  - `CreateReservation`
  - `ListReservations`
- [x] Create DTOs for reservation input/output.

## 2) Bootstrap and Environment
- [x] Initialize Symfony API project structure (if not already initialized).
- [x] Initialize Vue.js frontend workspace.
- [x] Configure environment variables for API and frontend.
- [x] Configure Doctrine in Symfony.
- [x] Configure SQLite as default local database.
- [x] Add Docker + Docker Compose baseline for `api` and `frontend` services.

## 3) Doctrine Data Model (PDF Required)
- [x] Implement `Equipment` entity with fields:
  - `id`
  - `name`
  - `reference` (unique)
- [x] Implement `Reservation` entity with fields:
  - `id`
  - `startDate`
  - `endDate`
  - `userEmail`
  - `equipment` (`ManyToOne` relation)
- [x] Add unique constraint on `equipment.reference`.
- [x] Ensure foreign key from reservation to equipment.
- [x] Generate Doctrine migration(s).
- [x] Run migrations on SQLite.

## 4) Persistence and Domain Rules
- [x] Implement Doctrine repository classes for equipment and reservations.
- [x] Implement overlap query for reservations on same equipment.
- [x] Implement domain rule: `endDate > startDate`.
- [x] Implement domain/application rule: reject overlapping reservations.

## 5) Reservation Application Use Cases
- [x] Implement `CreateReservation` use case service:
  - Input validation
  - Equipment lookup
  - Overlap check
  - Persist reservation
- [x] Implement `ListReservations` use case service.
- [x] Map domain/application errors to meaningful error types.

## 6) Symfony HTTP Layer
- [x] Implement equipment listing endpoint: `GET /api/equipment`.
- [x] Implement reservation creation endpoint: `POST /api/reservations`.
- [x] Return expected status codes:
  - `201` for success
  - `400` for invalid dates/payload
  - `409` for overlap conflict
- [x] (Optional) Implement reservation list endpoint: `GET /api/reservations`.

## 7) Vue Frontend (Async Reservation Flow)
- [x] Create reservation page UI:
  - Equipment selector
  - User email input
  - Start/end date inputs
  - Submit action
- [x] Integrate API calls with `fetch` (no page reload).
- [x] Display explicit success and error messages from API.
- [x] Handle loading and disabled submit states.

## 8) Sample Data (SQLite Fixtures)
- [x] Add fixtures for at least 3 equipment records.
- [x] Add fixture reservations for:
  - one valid existing booking
  - one scenario enabling overlap conflict tests
- [x] Add fixture loading command to README instructions.

## 9) Backend Tests (PHPUnit)
- [x] Unit tests for date validation rule.
- [x] Unit tests for overlap detection rule.
- [x] Integration test: create reservation success (`201`).
- [x] Integration test: overlap conflict (`409`).
- [x] Integration test: invalid dates (`400`).

## 10) Frontend and E2E Tests
- [x] Vue unit tests for form behavior and message rendering.
- [x] Playwright E2E: successful reservation flow.
- [x] Playwright E2E: overlap conflict flow.
- [x] Playwright E2E: invalid dates flow.

## 11) CI Pipeline
- [x] Add backend CI job:
  - install deps
  - migrate SQLite schema
  - run PHPUnit
- [x] Add frontend CI job:
  - install deps
  - run unit tests
  - build app
- [x] Add E2E CI job:
  - start dockerized stack
  - run Playwright
- [x] Ensure pipeline fails on any failed stage.

## 12) Dockerization
- [x] Finalize Dockerfiles for API and frontend.
- [x] Finalize `infra/docker/docker-compose.yml` for local orchestration.
- [x] Mount volume for persistent SQLite file.
- [x] Verify local run of API + UI + tests in containers.

## 13) Documentation and Handover
- [x] Update README with setup instructions.
- [x] Document environment variables.
- [x] Document migration and fixtures commands.
- [x] Document backend/frontend/test commands.
- [x] Add short architecture note (DDD boundaries and responsibility split).

## 14) Definition of Done Checklist
- [x] All PDF consignes are implemented and traceable.
- [x] Overlap rule is enforced reliably.
- [x] Async frontend flow works with explicit messages.
- [x] Backend tests (PHPUnit) pass.
- [x] Frontend unit tests pass.
- [x] Playwright E2E tests pass.
- [ ] CI pipeline passes end-to-end.

## 15) Architecture Cleanup
- [x] Remove unused framework scaffolding files/folders to keep DDD structure clear.

## 16) JWT Authentication
- [x] Add login endpoint and JWT token generation.
- [x] Protect reservation create/list endpoints with bearer token.
- [x] Update frontend to authenticate first and store token in localStorage.
- [x] Update backend and frontend tests for authenticated reservation flow.

## 17) Auth Routing + Security Extension

### 17.1 Database
- [x] Add `User` entity migration (email unique, password hash, timestamps).
- [x] Add `PasswordResetToken` entity migration (token hash unique, expiry, used flag).
- [x] Add indexes/constraints for auth lookups and reset validity.
- [x] Add fixtures for at least one user and optional reset-token test fixture.

### 17.2 API (Symfony + DDD)
- [x] Add auth domain models/repositories in `api/src/Auth/Domain`.
- [x] Add auth application use cases:
  - [x] `Signup`
  - [x] `Login`
  - [x] `RequestPasswordReset`
  - [x] `ResetPassword`
- [x] Add password hashing adapter in infrastructure.
- [x] Add/extend JWT token manager and claims validation.
- [x] Add HTTP controllers/endpoints:
  - [x] `POST /api/auth/signup`
  - [x] `POST /api/auth/login`
  - [x] `POST /api/auth/forgot-password`
  - [x] `POST /api/auth/reset-password`
- [x] Add middleware/guard for protected routes (`/api/reservations*`).
- [x] Ensure controllers remain thin and errors map to correct status codes.

### 17.3 Frontend (Vue + Router)
- [x] Install and configure `vue-router`.
- [x] Create pages:
  - [x] `LoginPage`
  - [x] `SignupPage`
  - [x] `ForgotPasswordPage`
  - [x] `ReservationCreatePage` (protected)
  - [x] `ReservationListPage` (protected)
- [x] Implement route guards based on JWT presence.
- [x] Implement auth service/store for token persistence and logout.
- [x] Refactor API client to include bearer token automatically.
- [x] Keep reservation UX feedback behavior intact after routing split.

### 17.4 Security Hardening
- [x] Enforce password policy (minimum length and basic complexity).
- [x] Use generic forgot-password response to avoid account enumeration.
- [x] Store reset tokens hashed (never plain token at rest).
- [x] Enforce reset-token expiry and single-use semantics.
- [x] Keep auth secrets/env values out of committed sensitive files in production docs.

### 17.5 Tests
- [x] Backend unit tests:
  - [x] password policy
  - [x] JWT encode/decode validation
  - [x] reset-token lifecycle rules
- [x] Backend integration tests:
  - [x] signup success/conflict
  - [x] login success/invalid credential
  - [x] forgot/reset password
  - [x] protected reservation endpoints reject missing/invalid token
- [x] Frontend unit tests:
  - [x] router guard redirects
  - [x] login/signup/forgot page behavior
  - [x] token persistence and logout
- [x] Playwright E2E:
  - [x] unauthenticated redirect to login
  - [x] signup -> login -> reservation happy path
  - [x] forgot/reset-password flow
  - [x] authenticated reservation error flows

### 17.6 Infra / CI
- [x] Update CI scripts in `infra/ci` to include new auth/routing tests.
- [x] Ensure dockerized stack still boots and supports new routes.
- [x] Update README and architecture docs for new auth/routing design.

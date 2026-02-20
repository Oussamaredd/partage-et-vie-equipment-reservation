# Equipment Reservation - Implementation Plan (Symfony + Vue + Doctrine)

## 1. Goal (PDF Context)
Build a small equipment reservation application for employees.

Mandatory business rule from the test brief:
- One equipment cannot be reserved by two different users on overlapping dates.

## 2. Functional Scope (Extended by Request)
Base MVP from PDF plus requested authentication and routing scope.

- Manage equipment reservations.
- Authenticate user before protected actions.
- Create reservation with: equipment, start date, end date (user resolved from JWT).
- Validate dates consistency (`end_date > start_date`).
- Reject overlap for same equipment and time window.
- Process reservation form asynchronously from frontend (`fetch`), without page reload.
- Return explicit success/error messages.
- Add auth endpoints:
  - login
  - signup
  - forgot password

Out of scope for now:
- Roles/authorization levels.
- Advanced admin screens.
- Notifications.
- External email provider integration (forgot-password will use local token flow first).

## 3. Stack
- Backend API: Symfony (PHP)
- ORM: Doctrine ORM + Doctrine Migrations
- Database: SQLite (local and default CI path)
- Frontend: Vue.js (fetch to Symfony API)
- Tests: PHPUnit (backend unit/integration), Vue unit tests, Playwright E2E
- Runtime/Dev: Docker + Docker Compose
- CI: Pipeline running API + UI + E2E tests

## 4. Data Model (Doctrine)

### 4.1 Required Entities
- `Equipment`
  - `id` (primary key)
  - `name`
  - `reference` (unique)
- `Reservation`
  - `id` (primary key)
  - `startDate`
  - `endDate`
  - `userEmail`
  - relation `ManyToOne` to `Equipment`

### 4.2 Authentication Entities (Requested)
- `User`
  - `id` (primary key)
  - `email` (unique)
  - `passwordHash`
  - `createdAt`
- `PasswordResetToken`
  - `id` (primary key)
  - `user` relation (`ManyToOne`)
  - `tokenHash` (unique)
  - `expiresAt`
  - `usedAt` (nullable)

### 4.3 Constraints
- Unique DB constraint on `equipment.reference`.
- Foreign key from `reservation.equipment_id` to `equipment.id`.
- Unique DB constraint on `user.email`.
- Unique DB constraint on `password_reset_token.token_hash`.
- Application-level validation for:
  - date coherence
  - overlap conflict on same equipment
  - auth credential validity
  - reset token expiry/usage

## 5. DDD-Oriented Architecture (Lightweight)
Pragmatic DDD, without over-engineering.

- `src/Equipment/Domain`
  - `Equipment` aggregate root (Doctrine entity)
  - `EquipmentRepositoryInterface`
- `src/Reservation/Domain`
  - `Reservation` aggregate root (Doctrine entity)
  - domain services/specifications for booking rules
  - `ReservationRepositoryInterface`
- `src/Reservation/Application`
  - use cases (`CreateReservation`, `ListReservations`)
  - input/output DTOs
  - application services orchestrating repositories + domain rules
- `src/Shared/Infrastructure/Persistence/Doctrine`
  - Doctrine repository implementations
  - overlap query implementation
- `src/Reservation/Infrastructure/Http`
  - Symfony controllers (thin: request/response only)
- `src/Auth/Domain`
  - `User`, `PasswordResetToken` aggregates
  - repository interfaces and auth exceptions
- `src/Auth/Application`
  - use cases: `Signup`, `Login`, `RequestPasswordReset`, `ResetPassword`
  - DTOs and password policy service
- `src/Auth/Infrastructure`
  - JWT manager, password hasher adapter
  - HTTP middleware (bearer token guard)
  - auth controllers

Design rule:
- Controllers do not hold business logic.
- Business rules live in application/domain layer.
- Persistence details stay in infrastructure layer.

## 6. API Contract
- `POST /api/auth/signup`
  - body: `email`, `password`
  - responses: `201`, `400`, `409`
- `POST /api/auth/login`
  - body: `email`, `password`
  - responses: `200` with JWT, `401`
- `POST /api/auth/forgot-password`
  - body: `email`
  - response: `200` (generic message)
  - creates reset token in DB (local flow)
- `POST /api/auth/reset-password`
  - body: `token`, `newPassword`
  - responses: `200`, `400`, `410`

- `GET /api/equipment`
  - list equipment for reservation form.
- `POST /api/reservations`
  - create reservation.
  - body: `equipmentId`, `startDate`, `endDate`.
  - requires bearer JWT token.
  - responses:
    - `201` created (success message)
    - `400` invalid dates
    - `401` unauthorized
    - `409` overlap conflict

Optional endpoint for list/testing UX:
- `GET /api/reservations` (resolved from authenticated user token)

Middleware requirement:
- Protect `/api/reservations*` with bearer-token middleware/guard.
- Leave `/api/auth/*` public.

## 7. Frontend Plan (Vue + Router)
- Use `vue-router` with route-level guards.
- Pages:
  - `/login`
  - `/signup`
  - `/forgot-password`
  - `/reservations/new` (protected)
  - `/reservations` (protected)
- Route guards:
  - if no JWT, redirect protected routes to `/login`
  - if JWT exists, redirect `/login` to `/reservations/new`
- Persist JWT in localStorage and inject bearer token in API client.
- Signup/login/forgot/reset forms handled asynchronously with explicit success/error messages.
- Reservation form remains asynchronous and guarded by authentication.

## 8. SQLite Strategy
- Use SQLite file for simplicity and fast onboarding.
- `DATABASE_URL` points to SQLite database file.
- Manage schema via Doctrine migrations.
- Seed sample data via fixtures:
  - at least 3 equipment items
  - a few reservations to test conflict and success scenarios

## 9. Docker Setup
Compose services:
- `api` (PHP + Symfony)
- `frontend` (Vue dev server/build)

SQLite note:
- no separate DB container needed.
- mount project volume so SQLite file persists during local development.

## 10. Testing Strategy

Backend testing framework:
- PHPUnit is the mandatory framework for all backend tests.

### 10.1 Backend Unit Tests (PHPUnit)
- Reservation date validation.
- Overlap rule behavior.
- Password policy validation.
- JWT token generation/validation.
- Reset-token expiry/usage rules.

### 10.2 Backend Integration Tests (PHPUnit)
- Create reservation success path.
- Reject overlap with `409`.
- Reject invalid dates with `400`.
- Reject reservation call without token (`401`).
- Signup success + duplicate email conflict.
- Login success + invalid credential path.
- Forgot-password creates token and reset-password updates hash.

### 10.3 Frontend Unit Tests
- Form validation and state transitions.
- API error/success message rendering.
- Router guard behavior for protected pages.
- Auth token persistence and logout behavior.

### 10.4 E2E Tests (Playwright)
- Signup then login then reserve equipment successfully.
- Block unauthenticated access to protected reservation page.
- Forgot-password request and reset-password flow (local token fixture path).
- Authenticated conflict and invalid-date reservation error cases.

## 11. CI Pipeline
Minimal pipeline stages:
1. Backend dependencies + migrations + PHPUnit (unit + integration).
2. Frontend dependencies + unit tests.
3. Build frontend.
4. Run Playwright E2E against dockerized app stack.

Pipeline must fail on any test failure.

## 12. Delivery Phases

### Phase 1 - Bootstrap
- Initialize Symfony API and Vue frontend.
- Configure Doctrine + SQLite.
- Configure Docker and baseline CI jobs.

### Phase 2 - Domain + Persistence
- Implement `Equipment` and `Reservation` entities.
- Add migrations and fixtures.
- Implement repository interfaces + Doctrine implementations.

### Phase 3 - Reservation Use Case
- Implement create reservation application service.
- Add overlap and date checks.
- Expose endpoint via thin controller.

### Phase 4 - Vue Reservation UI
- Build asynchronous reservation form using `fetch`.
- Handle API success/error responses clearly.

### Phase 5 - Tests + CI Stabilization
- Add/complete unit, integration, and E2E tests.
- Stabilize CI pipeline and document run instructions.

### Phase 6 - Auth + Routing Extension
- Add User and PasswordResetToken entities + migrations.
- Add auth use cases and controllers (signup/login/forgot/reset).
- Add backend auth middleware for protected endpoints.
- Add Vue router pages and guards.
- Extend tests and CI to include auth + routing flows.

## 13. Traceability to PDF Consignes
- Doctrine entities required by brief: covered in Section 4.
- Symfony controller + validation before save: covered in Sections 5 and 6.
- Async frontend with `fetch`: covered in Section 7.
- Explicit success/error messages: covered in Sections 6 and 7.
- Clean separation of responsibilities (decoupling): covered in Section 5.

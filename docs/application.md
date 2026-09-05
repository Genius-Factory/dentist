# Dentist application handbook

This handbook describes the application implemented in this repository. It is intended for clinic users, administrators, developers, and operators. The source code is the authority for behavior; setup instructions do not imply that a live deployment or external services have been tested.

## Application overview

The application lets signed-in users maintain patient profiles and request dental appointments. Clinic staff review requests, and administrators manage application user records and inspect stored data. Patient profiles and appointments are stored in PostgreSQL; Clerk provides identity and session authentication.

| Area | Implemented behavior |
| --- | --- |
| Patient profiles | Personal details, contact information, guardians, emergency contacts, allergies, notes, preferences, and profile photos |
| Reservations | Profile selection, reason for visit, urgency, duration, weekday time selection, review, and submission |
| Appointment tracking | Pending and approved requests, a pending edit countdown, cancellation, and archive views |
| Staff approvals | Review all requests and approve or decline appointments |
| Administration | Dashboard, username and role changes, application user deletion, and database table viewing |
| Observability | Database health endpoint, structured server logs, browser error collection, and an HTML log viewer |

There are no implemented treatment-plan, invoice, payment, AI-summary, dentist-availability, or notification-delivery APIs. The OpenAI and AWS S3 packages are declared dependencies but have no application integration in the inspected source. Displayed reservation prices are informational; no payment is collected. Photos are stored in PostgreSQL, not S3.

## Read and regenerate this handbook

Open `docs/index.html` directly in a browser. The HTML is self-contained and works offline without running the application, connecting to Clerk, or installing packages. It includes section search, navigation, light/dark appearance, copy buttons, and print styling.

From the repository root:

```powershell
node scripts/generate-docs.cjs
node scripts/generate-docs.cjs --open
node scripts/generate-docs.cjs --watch
```

You can combine `--watch --open`. Watch mode rebuilds after edits; refresh the browser to see the result. Stop watching with Ctrl+C. `--help` lists the supported options. From any directory, an absolute path to the script also works: all input and output paths are resolved relative to the script.

The server package also exposes these shortcuts:

```powershell
npm --prefix server run docs:html
npm --prefix server run docs:open
npm --prefix server run docs:watch
```

Edit `docs/application.md` for content, `docs/assets/handbook.css` for presentation, and `docs/assets/handbook.js` for browser interactions. Regenerate and commit `docs/index.html` with the source changes. The generator supports headings, paragraphs, single-level ordered/unordered lists, fenced code, tables, blockquotes, links, inline code, and bold text. Raw HTML is escaped. It is a deliberately small Markdown subset, not a general CommonMark implementation.

## Architecture and request flow

```text
Browser: React + React Router + Tailwind
  |                     |
  | Clerk session       | Bearer token on application requests
  v                     v
Clerk identity      Express API (default port 4000)
                        |-- authenticate: Clerk requireAuth()
                        |-- syncUser: Clerk profile -> local users row
                        |-- role / ownership checks
                        |-- PostgreSQL pool -> users, profiles, appointments
                        `-- JSON logs -> console + server/logs/app.log

Browser errors -> POST /api/logs -> server logger
Markdown + CSS + JavaScript -> generator -> standalone docs/index.html
```

The client is a Vite single-page application, served on port 5173 by default in development. `BrowserRouter` handles URLs. Pages fetch data when their authentication state is ready. Most record operations use the Fetch helpers in `client/src/lib/recordsApi.js`; an Axios client and `useApi` hook are also available.

The Express entry point loads dotenv, assigns a request ID, applies Helmet and CORS, parses JSON up to 4 MB, and installs Morgan logging. It mounts health, logging, users, records, and current-user endpoints, followed by not-found and centralized error middleware. The server does not serve the frontend build or this handbook.

Protected record requests authenticate and synchronize the Clerk user before accessing records. Staff can read all profiles and appointments; members receive only their own records. There is no polling, WebSocket feed, scheduled worker, or separate service layer. Refresh a page to reload changes made by another user.

### Technology and source map

Versions below are declared package ranges, not a guarantee about a particular installed dependency tree.

| Layer | Main dependencies |
| --- | --- |
| UI | React ^18.3.1, React Router ^7.13.0, Clerk React ^5.61.0 |
| UI utilities | Tailwind ^3.4.19, Lucide ^0.575.0, Axios ^1.13.5, react-hot-toast ^2.6.0 |
| Client build | Vite ^5.4.10, React Vite plugin ^4.3.3, ESLint ^9.13.0 |
| Server | Express ^4.22.1, Clerk Express ^1.7.72, pg ^8.18.0 |
| Server utilities | dotenv ^17.3.1, Helmet ^8.1.0, CORS ^2.8.6, Morgan ^1.10.0, express-async-errors ^3.1.1 |
| Development | nodemon ^3.1.13 |

```text
client/
  src/main.jsx                 Clerk provider, router, global browser logger
  src/App.jsx                  Routes, layout, navigation, footer
  src/pages/                   Screen components and form workflows
  src/components/              Navigation, loading state, decorative elements
  src/lib/recordsApi.js        Fetch wrappers for records and users
  src/lib/bookings.js          Roles, status, edit window, archive helpers
  src/lib/patientProfiles.js   Profile defaults, age/name/photo helpers
  src/lib/logger.js           Browser log queue and error listeners
  src/lib/api.js              Axios instance and auth/error interceptors
  src/hooks/useApi.js         Installs Axios interceptors
  vite.config.js              React build configuration; no API proxy
server/
  index.js                    HTTP server, CORS, route mounting
  middleware/auth.js          Authentication, role checks, user synchronization
  middleware/errorHandler.js  Error mapping and response shaping
  routes/records.js           Profiles, photos, appointments, DB inspector
  routes/users.js             Administrative user operations
  routes/logs.js              Public browser log ingestion
  lib/roles.js                Role normalization and hierarchy
  lib/logger.js               Structured logging and key redaction
  db/schema.sql              Schema and compatibility updates
  db/init-db.js               Statement-by-statement schema initializer
  db/index.js                 PostgreSQL connection pool
  scripts/logs-to-html.js     Existing HTML log generator
  tests/test-error-handler.js Error middleware checks
docs/                         Handbook source, assets, generated HTML
scripts/generate-docs.cjs      Offline documentation generator
```

## Installation and local setup

Use Node.js and npm compatible with the package manifests and installed dependencies. No Node version is pinned in this repository. The documentation generator itself requires Node 18 or later and no npm packages. The application requires a PostgreSQL database and a configured Clerk application.

### Install dependencies

Run from the repository root:

```powershell
npm --prefix server install
npm --prefix client install
```

The client and server are separate packages; there is no root application package. If you maintain committed lockfiles, use `npm ci` inside each package for reproducible installs. Otherwise use `npm install` and review the resulting lockfiles.

### Configure the server

Create `server/.env` with your own values:

```dotenv
DATABASE_URL=postgresql://APP_USER:APP_PASSWORD@DB_HOST:5432/dental_db
CLERK_SECRET_KEY=sk_test_REPLACE_ME
CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLIENT_URLS=http://localhost:5173
PORT=4000
LOG_LEVEL=info
NODE_ENV=development
```

Use keys for the same Clerk application on the frontend and backend. Clerk keys are consumed by the Clerk SDK. Do not put the secret key into a client variable. The app reads roles from Clerk user public metadata. For username editing, configure Clerk to accept usernames.

### Configure the client

Create `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
VITE_REMOTE_LOGGING=true
```

Set the API URL to the server origin, without an `/api` suffix or trailing slash. Record helpers append complete `/api/...` paths. Vite variables are included in browser code at build time. Restart development servers after changing environment files; rebuild the client when deployment variables change.

### Initialize PostgreSQL

The database must already exist. Both the runtime pool and initializer explicitly enable SSL with certificate verification disabled. A local PostgreSQL server without SSL will fail with these settings; configure an SSL-capable database or deliberately adjust both pool configurations for your local environment. There is no `DB_SSL` environment switch.

```powershell
cd server
npm run init-db
```

Read every initializer warning. It runs statements individually and continues after statement failures, so a successful process exit does not prove that every schema change succeeded. Verify that `users`, `patient_profiles`, and `appointments` exist and that the required columns match `server/db/schema.sql`. An alternative is to apply that SQL using your database administration tool.

No demo seed script is included. Create disposable users through Clerk and sample profiles/appointments through the UI when you need development data. The schema file contains an old library-system comment; its actual tables are for the current dental application.

### Start the application

In one terminal, from the repository root:

```powershell
cd server
npm run dev
```

In a second terminal, from the repository root:

```powershell
cd client
npm run dev
```

Open `http://localhost:5173`. Vite may select a different available port. With a localhost origin configured, the server also permits HTTP localhost aliases on other ports.

Check database connectivity separately:

```powershell
Invoke-RestMethod http://localhost:4000/healthz
```

The expected success body is `{"status":"ok","db":true}`. This checks one database query, not schema completeness or Clerk authentication. The current home page is a marketing page and does not include the old README's database-check button.

### Bootstrap administration

Create a user in your configured Clerk application, then set that user's public metadata role to `superadmin` using your Clerk administration access:

```json
{ "role": "superadmin" }
```

Sign in with that user and make a protected application request to synchronize the local row. There is no public role-bootstrap API. Changing only the PostgreSQL role is temporary because later synchronization overwrites it from Clerk. Refresh or sign in again if the UI still shows old metadata.

## Configuration reference

| Variable | Location | Behavior |
| --- | --- | --- |
| DATABASE_URL | Server | PostgreSQL connection string used by the pool and initializer |
| CLERK_SECRET_KEY | Server SDK | Clerk backend credential |
| CLERK_PUBLISHABLE_KEY | Server SDK | Matching Clerk application publishable key |
| PORT | Server | HTTP port; defaults to 4000 |
| CLIENT_URL / CLIENT_URLS | Server | Comma-separated allowed frontend origins |
| FRONTEND_URL / FRONTEND_URLS | Server | Additional comma-separated allowed origins |
| VERCEL_URL | Server | If present, adds an origin prefixed with https:// |
| LOG_LEVEL | Server | debug, info, warn, error; default/fallback info |
| LOG_FILE | Server | Log destination; default server/logs/app.log; relative overrides resolve from the process working directory |
| NODE_ENV | Server | production omits Error stack fields from structured logger output |
| VITE_API_URL | Client | API origin; defaults to http://localhost:4000 |
| VITE_CLERK_PUBLISHABLE_KEY | Client | Required to render the Clerk-enabled application |
| VITE_REMOTE_LOGGING | Client | Only the literal string false disables remote logging |

CORS combines all configured origins, trims whitespace, and removes trailing slashes. Requests without an Origin are accepted. When no origins are configured, all origins are accepted and the server logs a warning. If any configured origin is localhost, 127.0.0.1, or IPv6 loopback, HTTP origins on those loopback hosts are accepted on any port. Otherwise an unlisted origin receives 403. CORS credentials are enabled.

## Roles and permissions

The role hierarchy is `member < secretary < admin < superadmin`. The backend trims and lowercases role metadata; unknown roles fall back to member. Legacy `librarian` metadata is treated as member, and schema initialization changes old local librarian rows to member. Client normalization lowercases but does not trim; keep metadata values canonical.

### Interface access

| Screen or action | Member | Secretary | Admin | Superadmin |
| --- | --- | --- | --- | --- |
| Sign in, own profile, reservation, own bookings | Yes | Yes | Yes | Yes |
| Patient directory | No | Yes | Yes | Yes |
| Create profile controls | Yes | Hidden | Yes | Yes |
| Edit Details control | Own | Hidden | Hidden | Hidden |
| Approval screen | No | Yes | Yes | Yes |
| New reservation status | Pending | Approved | Approved | Approved |
| Dashboard, users, database inspector | No | No | Yes | Yes |
| Manage another user's role/record | No | No | Lower ranks only | Lower ranks only |

### Backend enforcement

Every authenticated user can create a profile or appointment. The server sets `user_id` to the authenticated caller, ignoring a supplied `userId`. Staff-created profiles and appointments therefore belong to the staff creator, even when the appointment refers to another user's patient profile. There is no owner reassignment endpoint.

Members can list, update, or delete only their own applicable records; secretary/admin/superadmin can manage all profiles and appointments. The secretary's hidden create-profile control and the staff-hidden Edit Details control are interface restrictions, not API permission restrictions. There is no profile-deletion API.

Only admin and superadmin can list users or view the database inspector API. Administrators can manage another user only if their rank is strictly higher, and can assign only a lower-ranked role. Equal-rank accounts cannot manage one another. An administrator may update their own username while retaining their role; nobody can delete their own local record, and a superadmin cannot demote themselves.

Deleting a user removes the application database row and cascades to that user's profiles and appointments. It does not delete the Clerk identity or revoke sign-in. A later protected request can recreate the user row, but does not restore deleted patient data.

## User guide and page reference

| URL | Purpose and access |
| --- | --- |
| / | Public dental landing page with promotional content |
| /sign-in | Clerk sign-in; optional redirect_url query parameter |
| /sign-up | Clerk sign-up; optional redirect_url query parameter |
| /my-profile | Signed-in profile details, selection, creation, editing, and history |
| /reservation | Signed-in reservation form; ?edit=APPOINTMENT_ID loads an editable own booking |
| /booked | Signed-in user's own appointments, status, countdown, and archives |
| /patients | Staff directory with text search |
| /patients/create | Profile page in create mode when the user's UI permissions allow creation |
| /patients/:profileId | Accessible profile details and appointment history |
| /secretary/appointments | Staff approval queue and archive view |
| /users | Administrator user search, edit, and deletion |
| /db | Administrator database inspector and error-log test |
| /admin/dashboard | Administrator activity dashboard |

Unrecognized client paths redirect to `/`. Access checks live in individual pages; the route list itself is not a centralized authorization guard. API checks remain the data access boundary.

### Patient profiles

Sign in and open My Profile. Create a profile, fill in its details, and save. A user may own multiple profiles. Personal information includes first/last name, birth date, gender, phone, email, and address. The UI also requires emergency contact name, relationship and phone, preferred contact method, communication preference, and language. Patients under 18 require guardian name, relationship, and phone. Allergies and notes are additional text fields.

Profile defaults are Phone for preferred contact, WhatsApp for communication, and English for language. Older SMS values are normalized to WhatsApp when building a profile payload; this does not send a message. Age is calculated from date of birth in the browser.

For a photo, choose JPEG, PNG, WebP, or GIF up to 2 MiB (2,097,152 bytes). Existing profiles have a separate Save Photo action. Saving details also uploads a selected pending photo after the profile is saved. Remove deletes a saved photo immediately. These are separate HTTP operations: a photo upload can fail after profile details have already saved.

The patient detail screen links the profile to appointment history. It first matches appointments by profile ID, with a name-and-birth-date fallback for older entries. Staff can use the Patients directory and search by name, email, phone, address, or gender.

### Request an appointment

1. Sign in and create or select a saved patient profile.
2. Open Book Appointment and select that profile.
3. Enter the reason for the visit and select low, medium, or high urgency.
4. Choose a duration, weekday date, and offered future time.
5. Review the entered information and submit.
6. Open Booked Appointments to follow the request.

The interface offers 30 minutes for a displayed $10 or 60 minutes for a displayed $20. Available choices cover weekdays from today through one month ahead, with starts in 30-minute increments between 08:00 and 17:00, ending by closing time. There is no dentist selector or occupied-slot conflict check.

The reservation form expects a multi-part name using Latin letters, spaces, apostrophes, or hyphens; a derived age between 1 and 120; and guardian contact for a minor. It requires a reason of at least 10 characters with at least six Latin letters and rejects certain placeholder strings. English keyword matching can reject low urgency for listed symptoms or display an urgent-care notice. This is static form logic, not an AI service or clinical assessment system.

### Pending, approval, and archives

Member submissions are marked pending by the client and receive an edit deadline 24 hours after creation. Editing retains the original deadline. The member UI enables editing and cancellation only while the request is pending and that deadline is in the future. Cancellation deletes the appointment record rather than setting a canceled status.

Staff submissions are immediately marked approved by the client. The staff approval page lists requests, links patient details, and allows approval or decline. It records actor IDs and timestamps in the update payload.

Declined entries, explicit archived entries, and approved appointments whose start time has passed appear in archive views. Passing the appointment date does not automatically archive pending entries. Archival is mainly calculated in the browser; it does not require a database update or scheduled job. Legacy entries without a status display as approved.

> The 24-hour deadline, status transitions, staff-only approval, scheduling hours, and most form validation are not enforced by the appointment update API. See Current limitations before relying on these as backend guarantees.

### Administrator workflow

Open the dashboard for today's appointments, total patient profiles, staff-role user count, pending requests, recent patients, and common reason-for-visit strings. Search filters today's appointments. The displayed staff count represents roles, not live presence. Popular Services groups free-text medicalIssue values; Add Service opens the reservation page.

The notifications badge, operational-status message, seven dentists on duty, and 18-minute wait estimate are hardcoded presentation content. Dashboard dates use a UTC date string for today's grouping. Its appointment table renders pending as Pending and other statuses as Confirmed; use the approval page for the underlying status.

Open Users to search by username, email, or role. Edit changes the Clerk username, Clerk metadata, and local user row. These operations are sequential across services and are not a distributed transaction. Delete has the cascading behavior described in Roles and permissions.

Open DB to inspect every table in the public schema. The page hides the binary profile_picture column visually, but the API still returns it. Refresh reloads data. Test Error Log calls a deliberately unimplemented `/api/debug/fail-log-test` URL, causing a normal 404 and a browser log entry.

## API reference

Base URL in development: `http://localhost:4000`. Except for health and log ingestion, requests use `Authorization: Bearer CLERK_SESSION_TOKEN`. JSON requests use `Content-Type: application/json`; photo uploads use a raw image body and its image MIME type. No pagination or filter query contract is implemented on collection endpoints.

The server generates or echoes `X-Request-Id` on responses. Centralized failures include `error` and `requestId` in JSON. Explicit route-level errors may include only `error`. Clerk middleware owns unauthenticated responses; verify its configured behavior instead of assuming every authentication failure uses the application JSON error shape.

### Complete endpoint inventory

| Method | Path | Access | Success response |
| --- | --- | --- | --- |
| GET | /healthz | Public | 200: status and database query result |
| GET | /healthz/healthz | Public | Same health handler; compatibility alias |
| POST | /api/logs | Public | 202: accepted count and requestId |
| GET | /api/me | Authenticated | 200: Clerk ID, first email, normalized role; synchronizes user |
| GET | /api/users | Admin/superadmin | 200: all local users, newest first |
| PUT | /api/users/:userId | Admin/superadmin plus hierarchy | 200: updated local user |
| DELETE | /api/users/:userId | Admin/superadmin plus hierarchy | 200: success and removed ID |
| GET | /api/records/profiles | Own records or staff | 200: profile array, newest first |
| POST | /api/records/profiles | Authenticated | 201: created profile |
| PUT | /api/records/profiles/:id | Owner or staff | 200: updated profile |
| PUT | /api/records/profiles/:id/profile-picture | Owner or staff | 200: updated profile with photo |
| DELETE | /api/records/profiles/:id/profile-picture | Owner or staff | 200: updated profile without photo |
| GET | /api/records/appointments | Own records or staff | 200: array ordered by date and time |
| POST | /api/records/appointments | Authenticated | 201: created appointment |
| PUT | /api/records/appointments/:id | Owner or staff | 200: updated appointment |
| DELETE | /api/records/appointments/:id | Owner or staff | 200: {"success":true} |
| GET | /api/records/admin/database | Admin/superadmin | 200: array of {name, records} for public tables |

There is no GET-by-ID profile or appointment endpoint. Pages fetch a visible collection and select an item locally. There are no `/api/patients`, `/api/treatments`, `/api/billing`, or `/api/ai` routes.

### Profile payload

Create requires a caller-generated unique `id`; browser code uses `crypto.randomUUID()`. Send the full profile when creating or updating. The update is not a partial patch: omitted regular fields become null, which may erase optional values or fail database constraints. A photo is preserved on update when `profilePicture` is omitted.

```json
{
  "id": "example-profile-001",
  "firstName": "Alex",
  "lastName": "Example",
  "dateOfBirth": "1990-04-12",
  "gender": "Other",
  "phone": "+0000000000",
  "email": "alex@example.com",
  "address": "Example address",
  "guardianName": "",
  "guardianRelationship": "",
  "guardianPhone": "",
  "emergencyContactName": "Sam Example",
  "emergencyContactRelationship": "Sibling",
  "emergencyContactPhone": "+0000000001",
  "allergies": "",
  "notes": "Example data only",
  "preferredContactMethod": "Phone",
  "communicationPreference": "WhatsApp",
  "language": "English"
}
```

Responses add `userId`, `createdAt`, `updatedAt`, `profilePicture`, and `profilePictureType`. Most absent text fields become empty strings. Birth dates use YYYY-MM-DD. Photos return as base64 plus a MIME type; construct a data URL using those fields.

The JSON API also accepts `profilePicture` as a supported image data URL or base64 paired with `profilePictureType`. Empty photo input clears the photo. The UI uses the separate binary endpoint, which accepts the file itself, not multipart form-data. The size/type checks trust the supplied MIME type and do not inspect image file signatures.

### Appointment payload

Create requires `id` and a valid future `date`/`time`, plus the database's non-null fields. The example date is illustrative: replace it with an actual future date. Send the complete writable field set on updates; omitted fields become null. Server-generated ownership and creation timestamps are not taken from the request.

```json
{
  "id": "example-appointment-001",
  "profileId": "example-profile-001",
  "name": "Alex Example",
  "dateOfBirth": "1990-04-12",
  "guardianContact": "",
  "medicalIssue": "Routine dental checkup requested",
  "emergencyLevel": "low",
  "duration": 30,
  "date": "2099-01-05",
  "time": "09:00",
  "status": "pending",
  "requestedByRole": "member",
  "editableUntil": "2099-01-02T09:00:00.000Z",
  "approvedAt": null,
  "approvedBy": null,
  "declinedAt": null,
  "declinedBy": null
}
```

The client normally sets editableUntil to creation time plus 24 hours. The server currently accepts the supplied deadline and status/actor metadata. A linked profile must exist due to its foreign key, but the API does not verify that the caller owns that profile when creating or updating an appointment.

Appointment responses contain the original snake_case database fields plus camelCase aliases. Use `date` (YYYY-MM-DD), `time` (HH:mm), `userId`, `profileId`, `medicalIssue`, `emergencyLevel`, and the camelCase audit fields in client code. Unlike profile responses, appointment responses are not exclusively camelCase.

### User update and logging payloads

A user update requires a nonempty trimmed username and an exact supported lowercase role. It first updates the username in Clerk, then public metadata, then PostgreSQL.

```json
{ "username": "clinic_secretary", "role": "secretary" }
```

Logs accept one entry or a `logs` array. At most 25 entries are processed per request. Levels are debug, info, warn, and error; unknown levels become info. String fields are truncated to 1,000 characters, and context accepts at most 50 top-level keys.

```json
{
  "logs": [{
    "level": "info",
    "message": "Documentation example",
    "source": "browser",
    "timestamp": "2026-09-05T09:00:00.000Z",
    "url": "http://localhost:5173/",
    "context": { "screen": "example" }
  }]
}
```

### Response errors

| Status | Typical meaning |
| --- | --- |
| 400 | Missing ID, invalid future date/time on creation, invalid image type/body, malformed JSON, invalid user update |
| 403 | Insufficient ownership/role, forbidden user hierarchy operation, or blocked CORS origin |
| 404 | Missing record, unmatched endpoint, or inaccessible appointment deletion |
| 409 | PostgreSQL unique violation, such as duplicate ID, email, or username |
| 413 | JSON payload or raw photo exceeds parser limit |
| 500 | Unmapped database/service failure; public message is Server error |

Foreign-key and not-null violations are not explicitly mapped to a client error, and can therefore return 500. Do not interpret the database's default values as API defaults: insert helpers explicitly supply null for missing writable fields.

## Database reference

The schema uses string primary keys. Users use Clerk IDs; the client generates profile and appointment UUID strings. There is no ORM, migration-history table, soft-delete layer, or database row-level ownership policy in the supplied SQL.

```text
users.id --< patient_profiles.user_id  (delete user: cascade)
users.id --< appointments.user_id      (delete user: cascade)
patient_profiles.id --< appointments.profile_id (delete profile: set null)
```

### users

| Column | Type / rule | Meaning |
| --- | --- | --- |
| id | VARCHAR(255), primary key | Clerk user ID |
| username | VARCHAR(255), unique | Clerk username or synchronization fallback |
| email | VARCHAR(255), unique, not null | First Clerk email address |
| role | VARCHAR(50), default member | Application role; no SQL role enum/check |
| created_at | TIMESTAMP, default NOW() | Local row creation |

Synchronization fetches the Clerk user on each protected records request and applicable users/me requests. Username fallback order is Clerk username, public metadata username, first name, then email local part. It updates by ID; if absent, it tries matching by email before inserting. That transaction can still encounter uniqueness or foreign-key errors. Foreign keys do not declare ON UPDATE CASCADE, so reconciling an old user ID with dependent records needs care.

### patient_profiles

| Columns | Type / rule |
| --- | --- |
| id | VARCHAR(255), primary key |
| user_id | VARCHAR(255), required users foreign key |
| first_name, last_name | VARCHAR(255), not null, default empty string |
| date_of_birth | DATE |
| gender, phone | VARCHAR(100) |
| email | VARCHAR(255) |
| address | TEXT |
| profile_picture | BYTEA |
| profile_picture_type | VARCHAR(100) |
| guardian_name, guardian_relationship | VARCHAR(255) |
| guardian_phone | VARCHAR(100) |
| emergency_contact_name, emergency_contact_relationship | VARCHAR(255) |
| emergency_contact_phone | VARCHAR(100) |
| allergies, notes | TEXT |
| preferred_contact_method, communication_preference, language | VARCHAR(100) |
| created_at, updated_at | TIMESTAMP, default NOW() |

There is an index on user_id. No uniqueness rule limits a user to one profile. API updates explicitly set updated_at; there is no database trigger maintaining it for direct SQL changes.

### appointments

| Columns | Type / rule |
| --- | --- |
| id | VARCHAR(255), primary key |
| user_id | VARCHAR(255), required users foreign key |
| profile_id | VARCHAR(255), nullable patient_profiles foreign key |
| name | VARCHAR(255), not null |
| date_of_birth | DATE |
| guardian_contact | TEXT |
| medical_issue | TEXT, not null |
| emergency_level | VARCHAR(50), not null |
| duration | INTEGER, not null |
| appointment_date, appointment_time | DATE and TIME, both not null |
| status | VARCHAR(50), not null, default pending |
| requested_by_role | VARCHAR(50) |
| editable_until | TIMESTAMPTZ |
| approved_at, declined_at | TIMESTAMP |
| approved_by, declined_by | VARCHAR(255), no foreign keys |
| created_at, updated_at | TIMESTAMP, default NOW() |

Indexes cover user_id and profile_id. There is no unique appointment-slot index or exclusion constraint to prevent overlap. There are no SQL checks restricting status, urgency, or positive/supported durations.

### Dates and schema changes

The edit deadline is an absolute instant stored in TIMESTAMPTZ. The schema includes a conversion of older editable_until timestamps using UTC. Other timestamp columns do not carry a timezone. Appointment date and time have no clinic timezone column; the browser and server interpret their combined value in their respective local timezones. Use consistent environments and verify cross-timezone behavior when deploying.

The schema's compatibility statements add username/photo columns, create indexes, normalize librarian roles, and convert the edit deadline. They run each time the initializer runs. Review them against the existing schema and session timezone before reapplying to a populated database; this is not a versioned migration runner. Back up data before operational schema changes.

## Logging and troubleshooting

Server logs are JSON lines written to console and `server/logs/app.log`, unless LOG_FILE overrides that destination. The logger redacts object keys matching authorization, token, password, secret, cookie, session, or API-key patterns, limits nesting, and truncates arrays/objects. Redaction does not remove sensitive information embedded in arbitrary message strings or URLs.

Morgan records method, URL, status, duration, origin, user context, and request ID. Raw profile-photo diagnostics use console.log and are not necessarily written to the structured log file. There is no built-in log rotation or retention policy.

The browser logger queues at most 100 entries, sends batches of 10, schedules a flush after one second for ordinary messages, and attempts an immediate flush for errors. It listens for unhandled errors and promise rejections and uses sendBeacon when the page becomes hidden. It requeues fetch failures but has no durable storage or guaranteed-delivery contract.

### View logs as HTML

From the repository root:

```powershell
npm --prefix server run logs:html
npm --prefix server run logs:html:watch
```

Open `server/logs/app.html`. The log HTML refreshes every two seconds; watch mode regenerates it when the log file changes. With custom paths:

```powershell
node server/scripts/logs-to-html.js path/to/input.log path/to/output.html --watch
```

The log generator uses its default file paths or positional arguments; it does not automatically read LOG_FILE from the application's dotenv configuration. This log viewer is separate from the application handbook generator.

### Common problems

| Symptom | Check or action |
| --- | --- |
| Missing Clerk publishable key screen | Set VITE_CLERK_PUBLISHABLE_KEY in client/.env.local and restart Vite |
| Authentication fails | Verify matching Clerk application keys, current session, and Bearer token; inspect backend Clerk errors |
| Role changes disappear | Change Clerk public metadata, since synchronization overwrites the local database role |
| UI still shows previous role | Refresh Clerk user/session data or sign in again |
| CORS 403 | Put the frontend origin in CLIENT_URLS or FRONTEND_URLS and restart the server |
| Health endpoint fails | Check DATABASE_URL, credentials, network access, and required SSL support |
| Health works but records fail | Confirm all schema statements and user synchronization succeed; health only runs SELECT 1 |
| Duplicate-record 409 | Inspect ID/email/username uniqueness and synchronization fallback collisions |
| Photo fails | Check MIME type, 2 MiB size, raw upload body, proxy limits, and photo schema columns |
| Appointment time appears inconsistent | Compare browser, server, and database timezones and the editable_until column type |
| Appointment cannot be edited in UI | Check pending status and original 24-hour deadline; approved requests are locked in the UI |
| Staff-created record missing from a member account | Ownership is assigned to the authenticated creator, not the selected patient owner |
| Empty or stale lists | Inspect failed network calls and refresh; several pages only log fetch failures to console |
| Log viewer empty with custom logging | Pass the actual LOG_FILE path as the generator's first argument |
| Deep link returns host 404 | Configure the frontend host to rewrite SPA paths to index.html |
| Documentation looks stale | Regenerate docs/index.html and refresh; watch mode does not reload the browser |

## Build, deployment, and maintenance

Build the client and start the server as separate processes:

```powershell
npm --prefix client run build
npm --prefix server start
```

The client build goes to `client/dist`. `npm --prefix client run preview` previews the built client locally. Deployment must provide static hosting with SPA fallback and a reachable Express service; there is no deployment pipeline, Docker configuration, or frontend-serving Express route included.

Configure the client API origin before building, configure backend allowed origins, supply backend secrets in the runtime environment, and apply the schema through a reviewed database process. Set NODE_ENV=production for server error-stack logging behavior. Keep the database and log storage persistent where required. The app has no application-managed backup/restore feature.

For maintenance, back up PostgreSQL using your database tooling and verify restoration on a separate environment. Include patient photo bytes in the backup. Avoid using the admin database JSON response as a backup format. Retain schema changes alongside code, and review both the Clerk role source and local database when investigating account issues.

### Existing checks and a manual smoke test

```powershell
npm --prefix client run lint
npm --prefix client run build
node server/tests/test-error-handler.js
node scripts/generate-docs.cjs
```

The existing server test covers not-found errors, custom status/request IDs, malformed JSON, oversized payloads, PostgreSQL uniqueness errors, hidden internal errors, and forwarding after headers are sent. There is no npm test script, full API integration suite, or end-to-end suite in the current packages.

Use disposable records for the following manual test:

1. Verify health, sign up/sign in, and trigger user synchronization.
2. Create a complete profile, reload, and verify persistence.
3. Upload and remove a supported photo, checking after reload.
4. Submit a future member appointment and verify pending status and countdown.
5. Edit and cancel a pending request within its window.
6. Submit another request, approve/decline it as staff, and verify member and archive views.
7. Confirm a second member cannot list or edit the first member's records.
8. Verify administrator hierarchy restrictions and dashboard/database access.
9. Run the DB page's error-log test and inspect its request ID in logs.

These are suggested verification steps, not a claim that the connected application has passed them.

## Current limitations and implementation gaps

This section records behavior visible in the repository so maintainers can distinguish interface expectations from server guarantees.

| Area | Current limitation and consequence |
| --- | --- |
| Appointment authorization | Owners can submit status, approval actors, and edit deadlines to the API; approval and the 24-hour lock are primarily UI rules |
| Schedule validation | Creation validates a future date/time, but update does not; no backend hours, weekday, duration, or overlap enforcement |
| Profile linking | Appointment profileId is checked by a foreign key only, not against the caller's ownership |
| Patient form validation | Many required UI fields lack equivalent API validation; omitted PUT fields may clear data or cause SQL errors |
| Staff ownership | Created records always belong to the caller; no create-on-behalf ownership assignment |
| Timezones | Mixed local date/time interpretation and UTC-derived day strings can disagree near boundaries |
| Database transport | SSL certificate verification is disabled in both pool configurations |
| Database inspector | Returns every public table and all records, including hidden-in-UI binary photos; no pagination |
| CORS | Empty configuration permits all origins; local development configuration broadens loopback access |
| Public logs | Log ingestion requires no authentication and has no rate limiter; request size/count caps do not provide retention control |
| Photos | MIME type and size are checked, but file signatures/content are not validated |
| User synchronization | Depends on Clerk availability and local constraints; email-based ID reconciliation can conflict with dependent records |
| User management | Clerk username, metadata, and DB changes can partially succeed; deleting a DB user does not revoke Clerk access |
| Dashboard content | Some operational indicators are static; some status labels simplify actual states |
| Scale and freshness | Lists load complete collections including base64 photos; there is no pagination, live update channel, or server search |
| Schema operations | Initializer continues after errors and has no version history or all-or-nothing migration transaction |
| Tests | Existing automated coverage is limited to error middleware; workflow checks require configured services |

## Documentation maintenance

When behavior changes, update the matching workflow, permission, API, configuration, and schema sections together. Pay particular attention to the distinction between UI controls and server checks. Update dependency ranges from the package manifests when necessary.

The documentation generator only reads its Markdown and presentation assets. It does not inspect `.env` files, export patient data, query the database, invoke Clerk, or start the application. No live account or patient data is embedded in the generated HTML.

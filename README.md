# WorkComposer Backend

Backend API for **WorkComposer**, a workforce productivity and time-tracking platform. The service provides authentication, organization and user management, time tracking, attendance, activity monitoring, screenshots, application usage, reports, project/task management, integrations, API access, billing, and real-time communication.

## Tech Stack

- Node.js
- Express 5
- MongoDB + Mongoose
- JWT authentication
- Socket.IO
- Stripe billing and webhooks
- Cloudinary for media storage
- Nodemailer / Brevo for email delivery
- Multer for uploads
- Axios for external API integrations
- node-cron for scheduled jobs
- date-fns / date-fns-tz for date and timezone handling

## Main Features

- User registration, login, email verification, refresh tokens, and logout
- Organization, team, role, and permission management
- Role-based report and screenshot access
- Time tracking and session management
- Attendance and work/break summaries
- Activity tracking and productivity analytics
- Screenshot capture and access control
- Web and application usage tracking
- Application productivity classification
- Project and task management
- Project tracking and manual time
- Location tracking
- Scheduled daily and weekly reports
- Audit logs
- API keys and API usage logs
- Third-party integrations and synchronization
- Stripe subscriptions and billing
- Time-tracking and shift settings
- Real-time Socket.IO communication

## Project Structure

```text
WorkComposer-Backend/
├── server.js
├── src/
│   ├── app.js
│   ├── config/          # Database, environment and service configuration
│   ├── controllers/     # Request/business logic
│   ├── cron/             # Scheduled jobs
│   ├── jobs/             # Background synchronization jobs
│   ├── middleware/       # Authentication and request middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API route definitions
│   ├── services/         # Business and integration services
│   ├── socket/           # Socket.IO setup
│   ├── templates/        # Email templates
│   └── utils/            # Shared helpers and utilities
├── uploads/              # Local uploaded files when enabled
├── package.json
└── README.md
```

## Requirements

- Node.js 18+ recommended
- MongoDB database
- Environment variables for the services enabled by the application

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/Rahul-git-web/WorkComposer-Backend.git
cd WorkComposer-Backend
npm install
```

Create a `.env` file in the project root with the values required by your deployment. At minimum, configure the application port, MongoDB connection, frontend URL, authentication secrets, and credentials for any external services you enable.

> Never commit `.env` files, JWT secrets, Stripe secrets, OAuth credentials, API keys, or other production credentials.

## Running Locally

Development mode:

```bash
npm run dev
```

Production/start mode:

```bash
npm start
```

The server uses port `5000` by default when `PORT` is not provided.

## API Base Path

The main REST API is exposed under:

```text
/api
```

Examples:

```text
/api/auth
/api/users
/api/sessions
/api/attendance
/api/activity
/api/usage
/api/reports
/api/projects
/api/tasks
/api/roles
/api/api-keys
/api/billing
```

The application also exposes a versioned API under:

```text
/api/v1
```

## Authentication

Protected endpoints use the application's JWT authentication middleware. Access tokens are used for authenticated API requests, with refresh-token support for renewing sessions.

For authenticated requests, send the access token as a Bearer token:

```http
Authorization: Bearer <access-token>
```

## Role-Based Access

WorkComposer uses organization-level roles and permissions. Report-related access supports scopes such as:

- `none` — no report access
- `own` — user's own data
- `managed` — managed users plus the user's own data
- `all` — organization-wide access

Screenshot access is handled separately from report access.

## Timezones

User/report timezone settings are used when converting local date ranges to UTC database ranges and when calculating date-sensitive tracking and attendance data. Keep timezone handling centralized through the project's timezone utilities rather than introducing ad-hoc date conversions in controllers.

## Scheduled Services

The server starts background/scheduled functionality during startup, including synchronization and daily/weekly summary/report jobs.

## Production Notes

- Set `NODE_ENV` and all production environment variables before deployment.
- Configure `FRONTEND_URL` for CORS and authenticated frontend requests.
- Use a production MongoDB deployment and restrict database access appropriately.
- Configure Stripe webhook endpoints using the Stripe webhook route.
- Configure email, media storage, OAuth, and integration credentials only when those features are enabled.
- Do not expose secrets in source control or logs.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API with Nodemon |
| `npm start` | Start the API with Node.js |
| `npm test` | Placeholder test command |

## Related WorkComposer Apps

This backend is designed to work with the WorkComposer web dashboard and desktop tracking application.

## License

ISC

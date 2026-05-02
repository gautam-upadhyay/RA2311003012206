# Hodos Full Stack Screening Tasks

This project completes the three requested tasks using Node.js, Express, and React.js.

## Applicant Details

```json
{
  "email": "gp4820@srmist.edu.in",
  "name": "Gautam Prasad Upadhyay",
  "rollNo": "RA2311003012206",
  "accessCode": "QkbpxH",
  "githubUsername": "gautam-upadhyay"
}
```

## Features

- Sign-up and login flow with token-based authentication.
- Dashboard redirect after authentication with `Welcome, {username}`.
- Tasks CRUD API using the required endpoints:
  - `POST /tasks`
  - `GET /tasks`
  - `PUT /tasks/:id`
  - `DELETE /tasks/:id`
- React dashboard for creating, listing, editing, and deleting tasks.
- Open-Meteo public API integration with invalid input, failed response, timeout, and network error handling.
- Bug diagnosis report in `bug_diagnosis_report.md`.

## Run locally

```bash
npm install
npm run dev
```

The React app runs at `http://127.0.0.1:5173` and proxies API requests to the Node server at `http://127.0.0.1:4000`.

## API Notes

Auth endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`

Submission endpoint:

- `GET /api/submission`

Task endpoints require an `Authorization: Bearer <token>` header.

Weather endpoint:

- `GET /api/weather?city=Chennai`

Data is stored locally in JSON files under `server/data/`. Those generated JSON files are ignored by Git.

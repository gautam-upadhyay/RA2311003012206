## REST API Design Contract

### Applicant Details

```json
{
  "email": "gp4820@srmist.edu.in",
  "name": "Gautam Prasad Upadhyay",
  "rollNo": "RA2311003012206",
  "accessCode": "QkbpxH",
  "githubUsername": "gautam-upadhyay"
}
```

### Authentication

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create a user with `username` and `password`, then return a bearer token. |
| POST | `/api/auth/login` | Authenticate an existing user and return a bearer token. |
| GET | `/api/auth/me` | Return the current authenticated user. |
| GET | `/api/submission` | Return applicant submission details. |

### Tasks

All task routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/tasks` | Create a task with `title` and `description`. |
| GET | `/tasks` | Retrieve all tasks for the logged-in user. |
| PUT | `/tasks/:id` | Update a task by id. |
| DELETE | `/tasks/:id` | Delete a task by id. |

### Public API Integration

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/weather?city=<city>` | Resolve the city through Open-Meteo and return current weather data. |

The weather endpoint handles invalid input, no city match, upstream failed responses, and timeout failures.

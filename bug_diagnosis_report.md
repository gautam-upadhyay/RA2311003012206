# Bug Diagnosis Report

Applicant: Gautam Prasad Upadhyay  
Email: gp4820@srmist.edu.in  
Roll no: RA2311003012206  
Access code: QkbpxH  
GitHub username: gautam-upadhyay

## Public API Integration

The app integrates Open-Meteo through the Node.js endpoint `GET /api/weather?city=<name>`. The server first resolves the city with the Open-Meteo geocoding API, then fetches the current temperature and wind speed from the forecast API. The React interface displays the result and shows readable errors for invalid input, no matching city, failed provider responses, and timeouts.

## Error 1: Invalid or Empty City Query

Root cause: The weather integration needs a valid location before calling Open-Meteo. Empty strings and one-character queries create vague provider behavior and a poor user experience.

Fix: The server validates `city` before calling the public API. If the value is shorter than two characters, it returns HTTP 400 with a clear message. The React form also marks the city input as required so users get immediate feedback.

Reliability improvement: Validation happens on the server, so direct API calls are protected even if a client bypasses the React form.

## Error 2: External API Timeout or Network Failure

Root cause: Public APIs can be slow, unavailable, blocked by network settings, or rate limited. A plain `fetch` without timeout can leave the UI waiting too long.

Fix: The Node.js weather endpoint wraps Open-Meteo requests in an `AbortController` with a 7-second timeout. Timeout failures return HTTP 504 with a readable message. Other provider failures return a non-success status and explanatory error.

Reliability improvement: The React interface clears old results before each search, displays loading state while waiting, and shows the returned error message instead of failing silently.

## Additional Notes

The Tasks API stores records in JSON files for simplicity and portability. Task routes are protected with JWT bearer tokens so each user sees only their own task records. Passwords are hashed with bcrypt before storage.

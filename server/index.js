import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { submissionDetails } from "../submissionDetails.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const usersFile = path.join(dataDir, "users.json");
const tasksFile = path.join(dataDir, "tasks.json");

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const JWT_SECRET =
  process.env.JWT_SECRET || "development-secret-change-before-deployment";
const TOKEN_TTL = "2h";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

async function readJson(filePath, fallback) {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeJson(filePath, fallback);
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function createToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function validatePassword(value) {
  return typeof value === "string" && value.length >= 6;
}

function publicUser(user) {
  return { id: user.id, username: user.username };
}

function requireAuth(request, response, next) {
  const header = request.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ error: "Missing bearer token." });
  }

  try {
    request.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return response.status(401).json({ error: "Invalid or expired token." });
  }
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "hodos-full-stack-screening" });
});

app.get("/api/submission", (_request, response) => {
  response.json(submissionDetails);
});

app.post("/api/auth/signup", async (request, response, next) => {
  try {
    const username = normalizeUsername(request.body.username);
    const password = request.body.password;

    if (username.length < 3) {
      return response
        .status(400)
        .json({ error: "Username must be at least 3 characters." });
    }

    if (!validatePassword(password)) {
      return response
        .status(400)
        .json({ error: "Password must be at least 6 characters." });
    }

    const users = await readJson(usersFile, []);
    const exists = users.some(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );

    if (exists) {
      return response.status(409).json({ error: "Username already exists." });
    }

    const user = {
      id: crypto.randomUUID(),
      username,
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await writeJson(usersFile, users);

    response.status(201).json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const username = normalizeUsername(request.body.username);
    const password = request.body.password;
    const users = await readJson(usersFile, []);
    const user = users.find(
      (record) => record.username.toLowerCase() === username.toLowerCase()
    );

    if (!user || !(await bcrypt.compare(password || "", user.passwordHash))) {
      return response
        .status(401)
        .json({ error: "Invalid username or password." });
    }

    response.json({
      token: createToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, async (request, response, next) => {
  try {
    const users = await readJson(usersFile, []);
    const user = users.find((record) => record.id === request.user.sub);

    if (!user) {
      return response.status(404).json({ error: "User not found." });
    }

    response.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/tasks", requireAuth, async (request, response, next) => {
  try {
    const title = String(request.body.title || "").trim();
    const description = String(request.body.description || "").trim();

    if (!title) {
      return response.status(400).json({ error: "Task title is required." });
    }

    const tasks = await readJson(tasksFile, []);
    const task = {
      id: crypto.randomUUID(),
      userId: request.user.sub,
      title,
      description,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    tasks.push(task);
    await writeJson(tasksFile, tasks);
    response.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

app.get("/tasks", requireAuth, async (request, response, next) => {
  try {
    const tasks = await readJson(tasksFile, []);
    response.json({
      tasks: tasks.filter((task) => task.userId === request.user.sub)
    });
  } catch (error) {
    next(error);
  }
});

app.put("/tasks/:id", requireAuth, async (request, response, next) => {
  try {
    const tasks = await readJson(tasksFile, []);
    const index = tasks.findIndex(
      (task) => task.id === request.params.id && task.userId === request.user.sub
    );

    if (index === -1) {
      return response.status(404).json({ error: "Task not found." });
    }

    const nextTitle =
      request.body.title === undefined
        ? tasks[index].title
        : String(request.body.title || "").trim();
    const nextDescription =
      request.body.description === undefined
        ? tasks[index].description
        : String(request.body.description || "").trim();

    if (!nextTitle) {
      return response.status(400).json({ error: "Task title is required." });
    }

    tasks[index] = {
      ...tasks[index],
      title: nextTitle,
      description: nextDescription,
      completed:
        typeof request.body.completed === "boolean"
          ? request.body.completed
          : tasks[index].completed,
      updatedAt: new Date().toISOString()
    };

    await writeJson(tasksFile, tasks);
    response.json({ task: tasks[index] });
  } catch (error) {
    next(error);
  }
});

app.delete("/tasks/:id", requireAuth, async (request, response, next) => {
  try {
    const tasks = await readJson(tasksFile, []);
    const task = tasks.find(
      (record) =>
        record.id === request.params.id && record.userId === request.user.sub
    );

    if (!task) {
      return response.status(404).json({ error: "Task not found." });
    }

    await writeJson(
      tasksFile,
      tasks.filter((record) => record.id !== task.id)
    );

    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get("/api/weather", async (request, response, next) => {
  const city = String(request.query.city || "").trim();

  if (city.length < 2) {
    return response
      .status(400)
      .json({ error: "Enter a city name with at least 2 characters." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const geocodeUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geocodeUrl.searchParams.set("name", city);
    geocodeUrl.searchParams.set("count", "1");
    geocodeUrl.searchParams.set("language", "en");
    geocodeUrl.searchParams.set("format", "json");

    const geocodeResponse = await fetch(geocodeUrl, {
      signal: controller.signal
    });

    if (!geocodeResponse.ok) {
      return response.status(geocodeResponse.status).json({
        error: "Weather lookup failed while resolving the city."
      });
    }

    const geocode = await geocodeResponse.json();
    const place = geocode.results?.[0];

    if (!place) {
      return response.status(404).json({ error: "No matching city found." });
    }

    const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
    forecastUrl.searchParams.set("latitude", place.latitude);
    forecastUrl.searchParams.set("longitude", place.longitude);
    forecastUrl.searchParams.set("current", "temperature_2m,wind_speed_10m");

    const forecastResponse = await fetch(forecastUrl, {
      signal: controller.signal
    });

    if (!forecastResponse.ok) {
      return response.status(forecastResponse.status).json({
        error: "Weather provider returned a failed response."
      });
    }

    const forecast = await forecastResponse.json();
    response.json({
      location: {
        name: place.name,
        country: place.country,
        latitude: place.latitude,
        longitude: place.longitude
      },
      current: forecast.current,
      units: forecast.current_units
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return response
        .status(504)
        .json({ error: "Weather request timed out. Please try again." });
    }
    if (error instanceof TypeError) {
      return response.status(502).json({
        error: "Network error while contacting the weather provider."
      });
    }
    next(error);
  } finally {
    clearTimeout(timeout);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({
    error: "Unexpected server error. Please try again."
  });
});

app.listen(PORT, () => {
  console.log(`API server running on http://127.0.0.1:${PORT}`);
});

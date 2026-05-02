import { useEffect, useMemo, useState } from "react";
import { submissionDetails } from "../submissionDetails.js";

const API_BASE = "";

async function apiRequest(path, { token, ...options } = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("");
    setIsSubmitting(true);

    try {
      const data = await apiRequest(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });
      onAuthenticated(data);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-shell">
      <div className="brand-panel">
        <p className="eyebrow">Full Stack Screening</p>
        <h1>Full stack task console</h1>
        <p>
          Sign up or log in, manage task records through the API, and verify a
          public weather integration with clear failure states.
        </p>
        <div className="submission-strip" aria-label="Submission details">
          <span>{submissionDetails.name}</span>
          <span>{submissionDetails.rollNo}</span>
          <span>{submissionDetails.email}</span>
        </div>
      </div>

      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="segmented" aria-label="Authentication mode">
          <button
            className={mode === "login" ? "active" : ""}
            type="button"
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            type="button"
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

        <label>
          Username
          <input
            autoComplete="username"
            minLength={3}
            onChange={(event) => setUsername(event.target.value)}
            required
            value={username}
          />
        </label>

        <label>
          Password
          <input
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>

        {status ? <p className="error">{status}</p> : null}

        <button className="primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>
    </section>
  );
}

function TasksPanel({ token }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadTasks() {
    setIsLoading(true);
    setMessage("");

    try {
      const data = await apiRequest("/tasks", { token });
      setTasks(data.tasks);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  function startEdit(task) {
    setEditingId(task.id);
    setTitle(task.title);
    setDescription(task.description);
  }

  function resetForm() {
    setEditingId("");
    setTitle("");
    setDescription("");
  }

  async function handleSave(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editingId) {
        await apiRequest(`/tasks/${editingId}`, {
          method: "PUT",
          token,
          body: JSON.stringify({ title, description })
        });
      } else {
        await apiRequest("/tasks", {
          method: "POST",
          token,
          body: JSON.stringify({ title, description })
        });
      }

      resetForm();
      await loadTasks();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleDelete(id) {
    setMessage("");

    try {
      await apiRequest(`/tasks/${id}`, { method: "DELETE", token });
      await loadTasks();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Task 2</p>
          <h2>Tasks CRUD API</h2>
        </div>
        <span className="endpoint-pill">/tasks</span>
      </div>

      <form className="task-form" onSubmit={handleSave}>
        <input
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Task title"
          required
          value={title}
        />
        <input
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description"
          value={description}
        />
        <button className="primary" type="submit">
          {editingId ? "Update" : "Create"}
        </button>
        {editingId ? (
          <button className="ghost" onClick={resetForm} type="button">
            Cancel
          </button>
        ) : null}
      </form>

      {message ? <p className="error">{message}</p> : null}
      {isLoading ? <p className="muted">Loading tasks...</p> : null}

      <div className="task-list">
        {tasks.map((task) => (
          <article className="task-item" key={task.id}>
            <div>
              <h3>{task.title}</h3>
              <p>{task.description || "No description"}</p>
            </div>
            <div className="row-actions">
              <button className="ghost" onClick={() => startEdit(task)} type="button">
                Edit
              </button>
              <button className="danger" onClick={() => handleDelete(task.id)} type="button">
                Delete
              </button>
            </div>
          </article>
        ))}

        {!isLoading && tasks.length === 0 ? (
          <p className="empty">No tasks yet. Create one to exercise POST /tasks.</p>
        ) : null}
      </div>
    </section>
  );
}

function WeatherPanel() {
  const [city, setCity] = useState("Chennai");
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleLookup(event) {
    event.preventDefault();
    setWeather(null);
    setError("");
    setIsLoading(true);

    try {
      const data = await apiRequest(`/api/weather?city=${encodeURIComponent(city)}`);
      setWeather(data);
    } catch (lookupError) {
      setError(lookupError.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Task 3</p>
          <h2>Open-Meteo integration</h2>
        </div>
        <span className="endpoint-pill">/api/weather</span>
      </div>

      <form className="weather-form" onSubmit={handleLookup}>
        <input
          onChange={(event) => setCity(event.target.value)}
          placeholder="City name"
          required
          value={city}
        />
        <button className="primary" disabled={isLoading} type="submit">
          {isLoading ? "Checking..." : "Fetch weather"}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {weather ? (
        <div className="weather-result">
          <div>
            <p className="muted">
              {weather.location.name}, {weather.location.country}
            </p>
            <strong>
              {weather.current.temperature_2m}
              {weather.units.temperature_2m}
            </strong>
          </div>
          <div>
            <p className="muted">Wind</p>
            <strong>
              {weather.current.wind_speed_10m} {weather.units.wind_speed_10m}
            </strong>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SubmissionPanel() {
  return (
    <section className="panel submission-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Submission</p>
          <h2>Applicant details</h2>
        </div>
        <span className="endpoint-pill">/api/submission</span>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Name</dt>
          <dd>{submissionDetails.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{submissionDetails.email}</dd>
        </div>
        <div>
          <dt>Roll no</dt>
          <dd>{submissionDetails.rollNo}</dd>
        </div>
        <div>
          <dt>Access code</dt>
          <dd>{submissionDetails.accessCode}</dd>
        </div>
        <div>
          <dt>GitHub username</dt>
          <dd>{submissionDetails.githubUsername}</dd>
        </div>
      </dl>
    </section>
  );
}

function Dashboard({ session, onLogout }) {
  const displayName = useMemo(
    () => session.user.username.trim() || "there",
    [session.user.username]
  );

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">Task 1</p>
          <h1>Welcome, {displayName}</h1>
        </div>
        <button className="ghost" onClick={onLogout} type="button">
          Logout
        </button>
      </header>

      <div className="grid">
        <TasksPanel token={session.token} />
        <div className="side-stack">
          <SubmissionPanel />
          <WeatherPanel />
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    return token && user ? { token, user: JSON.parse(user) } : null;
  });

  function handleAuthenticated(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setSession(data);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setSession(null);
  }

  return session ? (
    <Dashboard onLogout={handleLogout} session={session} />
  ) : (
    <AuthPanel onAuthenticated={handleAuthenticated} />
  );
}

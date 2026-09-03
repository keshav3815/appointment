import { useState, type FormEvent, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { useAdminAuth } from "../../context/AdminAuthContext";

declare global {
  interface Window {
    google: any;
    __handleGoogleSignIn: (credentialResponse: any) => void;
  }
}

export function LoginPage() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [gmailEmail, setGmailEmail] = useState("");
  const [gmailPassword, setGmailPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"username" | "gmail">("username");

  // Load Google Sign-In script
  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => {
      // Initialize Google Sign-In after library loads
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
          callback: window.__handleGoogleSignIn,
        });
        
        // Render button to the container
        const container = document.getElementById("google_signin_button");
        if (container) {
          window.google.accounts.id.renderButton(container, {
            theme: "dark",
            size: "large",
            width: "100%",
          });
        }
      }
    };
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(script);
      } catch (e) {
        // Script already removed
      }
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!gmailEmail || !gmailPassword) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(gmailEmail, gmailPassword);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gmail login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = useCallback(async (credentialResponse: any) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Google login failed");
        return;
      }

      navigate("/admin");
    } catch (err) {
      setError("Google login error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Expose handleGoogleSignIn to global scope for Google Sign-In
  useEffect(() => {
    window.__handleGoogleSignIn = handleGoogleSignIn;
  }, [handleGoogleSignIn]);

  return (
    <div className="login-bg flex items-center justify-center p-4">
      <div className="relative z-10 bg-[var(--admin-glass)] backdrop-blur-xl rounded-2xl p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-[var(--admin-text)]">Admin Panel</h1>
          <p className="text-sm text-[var(--admin-text-muted)] mt-1">Doctor Appointment Booking System</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[rgba(239,68,68,0.12)] text-[var(--admin-danger)] text-sm px-4 py-2.5">
            {error}
          </div>
        )}

        {/* Login Method Tabs */}
        <div className="flex gap-2 mb-6 bg-white/5 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setLoginMethod("username")}
            className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all ${
              loginMethod === "username"
                ? "bg-[var(--admin-primary)] text-white"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            Username
          </button>
          <button
            type="button"
            onClick={() => setLoginMethod("gmail")}
            className={`flex-1 px-3 py-2 rounded-md font-medium text-sm transition-all ${
              loginMethod === "gmail"
                ? "bg-[var(--admin-primary)] text-white"
                : "text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
            }`}
          >
            Gmail
          </button>
        </div>

        {/* Username/Password Login */}
        {loginMethod === "username" && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1.5">
              Username
            </label>
            <input
              type="text"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full rounded-lg bg-white/5 border border-[var(--admin-border)] px-4 py-2.5 text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg bg-white/5 border border-[var(--admin-border)] px-4 py-2.5 text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-lg py-3 text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark))" }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        )}

        {/* Gmail Login */}
        {loginMethod === "gmail" && (
        <form onSubmit={handleGmailSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1.5">
              Gmail Email
            </label>
            <input
              type="email"
              autoFocus
              value={gmailEmail}
              onChange={(e) => setGmailEmail(e.target.value)}
              placeholder="Enter your Gmail"
              className="w-full rounded-lg bg-white/5 border border-[var(--admin-border)] px-4 py-2.5 text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-[var(--admin-text-muted)] mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={gmailPassword}
              onChange={(e) => setGmailPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full rounded-lg bg-white/5 border border-[var(--admin-border)] px-4 py-2.5 text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:outline-none focus:border-[var(--admin-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full font-semibold rounded-lg py-3 text-white disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, var(--admin-primary), var(--admin-primary-dark))" }}
          >
            {loading ? "Signing in…" : "Sign In with Gmail"}
          </button>
        </form>
        )}

        <div className="text-center mt-4">
          <small className="text-[var(--admin-text-muted)]">Default: admin / password</small>
        </div>
      </div>
    </div>
  );
}

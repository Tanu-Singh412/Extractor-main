import React, { useState } from "react";
import { login } from "../services/api";
import Brand from "../components/common/Brand";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);
    try {
      const data = await login(username, password);
      if (data.success && data.admin) {
        onLogin(data.admin);
      } else {
        setErrorMsg(data.message || "Invalid username or password.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Invalid username or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-layout">
      <section className="login-story" aria-label="About DocuExtract">
        <Brand />
        <div className="login-story-content">
          <p className="eyebrow">LESS PAPERWORK. MORE CLARITY.</p>
          <h1>Every document.<br />In good order.</h1>
          <p className="login-description">Keep passport and insurance records in one place. Upload files, review the details, and track expiry dates.</p>
          <div className="document-illustration" aria-hidden="true">
            <div className="illustration-top"><span>DOCUMENT WORKFLOW</span><span>01 — 03</span></div>
            <div className="illustration-document">
              <div className="illustration-file"><svg width="30" height="36" viewBox="0 0 30 36" fill="none"><path d="M4 2h14l8 8v24H4V2Z M18 2v8h8 M9 17h12 M9 23h12 M9 29h7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></div>
              <div><strong>From file to record</strong><span>The details that matter, in one place.</span></div>
              <span className="illustration-check">✓</span>
            </div>
            <div className="illustration-steps"><span><b>01</b> Upload</span><span><b>02</b> Review</span><span><b>03</b> Save</span></div>
          </div>
        </div>
        <p className="login-story-footer">Built around your documents.</p>
      </section>
      <section className="login-form-pane" aria-labelledby="login-heading">
        <div className="login-mobile-brand"><Brand /></div>
        <div className="login-form-box">
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h2 id="login-heading">Welcome back.</h2>
          <p className="login-form-intro">Sign in to manage your documents.</p>
          {errorMsg && <div id="login-error" className="login-error" role="alert">{errorMsg}</div>}
          <form onSubmit={handleSubmit} aria-busy={isLoading}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" required aria-describedby={errorMsg ? "login-error" : undefined} />
            </div>
            <div className="login-field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input id="password" name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary login-submit" disabled={isLoading}>
              {isLoading ? "Signing in…" : "Sign in"}<span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="login-help">Need access? Contact your workspace administrator.</p>
        </div>
        <p className="login-form-footer">DocuExtract <span>/</span> Document management</p>
      </section>
    </main>
  );
}


import React, { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, LogOut, ChevronsUpDown, ShieldCheck } from "lucide-react";

function initialsOf(name) {
  if (!name) return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function HoldSignOut({ duration = 1200, onComplete }) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const [nudge, setNudge] = useState(false);
  const timer = useRef(null);
  const nudgeTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    };
  }, []);

  const start = () => {
    if (timer.current || done) return;
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    setNudge(false);
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      setHolding(false);
      setDone(true);
      onComplete?.();
    }, duration);
  };

  const cancel = () => {
    if (!timer.current) return;
    window.clearTimeout(timer.current);
    timer.current = null;
    setHolding(false);
    setNudge(true);
    nudgeTimer.current = window.setTimeout(() => setNudge(false), 1400);
  };

  const label = (
    <>
      <LogOut className="profile-menu-icon" size={16} />
      <span className="profile-menu-label">Sign out</span>
      <span className="profile-hold-hint">
        {nudge ? "Keep holding" : "Hold"}
      </span>
    </>
  );

  return (
    <button
      className="profile-menu-item profile-hold-btn"
      onBlur={cancel}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          cancel();
        }
      }}
      onPointerCancel={cancel}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        start();
      }}
      onPointerUp={cancel}
      role="menuitem"
      tabIndex={0}
      type="button"
    >
      {label}
      <span className="sr-only">, press and hold to confirm sign out</span>
      <span
        aria-hidden="true"
        className="profile-hold-fill"
        style={{
          clipPath:
            holding || done
              ? "inset(0 0 0 0 round 8px)"
              : "inset(0 100% 0 0 round 8px)",
          transition: holding
            ? `clip-path ${duration}ms linear`
            : "clip-path 240ms cubic-bezier(0.23, 1, 0.32, 1)",
        }}
      >
        <LogOut className="profile-menu-icon" size={16} />
        <span className="profile-menu-label">Signing out...</span>
      </span>
    </button>
  );
}

export default function ProfileDropdown({
  currentUser,
  onLogout,
  onChangePasswordClick,
  showSignOut = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  const username = currentUser?.username || "Admin";
  const initials = initialsOf(username);
  const role = currentUser?.role === "admin" ? "Administrator" : (currentUser?.role || "Administrator");

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const handlePasswordSelect = () => {
    setOpen(false);
    onChangePasswordClick?.();
  };

  return (
    <div
      ref={containerRef}
      className={`profile-dropdown-wrapper ${open ? "is-open" : ""}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((prev) => !prev)}
        className="profile-trigger-btn"
      >
        <div className="profile-avatar-circle">
          {initials}
          <span className="profile-status-dot" />
        </div>

        <div className="profile-user-meta">
          <span className="profile-user-name">{username}</span>
          <span className="profile-user-role">{role}</span>
        </div>

        <ChevronsUpDown
          size={15}
          className={`profile-trigger-chevron ${open ? "rotate" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={`${username} profile menu`}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: "spring", duration: 0.25, bounce: 0 }}
            className="profile-dropdown-menu"
          >
            <div className="profile-menu-header">
              <div className="profile-avatar-circle large">
                {initials}
                <span className="profile-status-dot" />
              </div>
              <div className="profile-user-meta">
                <div className="profile-header-title-row">
                  <span className="profile-header-name">{username}</span>
                  <ShieldCheck size={14} className="profile-shield-icon" />
                </div>
                <span className="profile-header-role">{role}</span>
              </div>
            </div>

            <div className="profile-menu-divider" />

            <button
              type="button"
              role="menuitem"
              onClick={handlePasswordSelect}
              className="profile-menu-item"
            >
              <KeyRound size={16} className="profile-menu-icon" />
              <span className="profile-menu-label">Change Password</span>
            </button>

            {showSignOut && (
              <>
                <div className="profile-menu-divider" />
                <HoldSignOut duration={1200} onComplete={onLogout} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

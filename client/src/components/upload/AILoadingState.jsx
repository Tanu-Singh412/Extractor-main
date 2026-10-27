import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { cn } from "@/lib/utils";
import "./AILoadingState.css";

const EASE_OUT = [0.23, 1, 0.32, 1];
const LINE_HEIGHT = 22;
const VISIBLE_LINES = 3;

const ACCURATE_PASSPORT_STEPS = [
  {
    id: "preprocess",
    label: "Preparing document & image",
    detail: [
      "checking document photo & angle",
      "enhancing text clarity & lighting",
      "identifying front and back pages",
    ],
  },
  {
    id: "ocr",
    label: "Reading document text",
    detail: [
      "scanning words and numbers",
      "finding name & passport sections",
      "reading bottom code lines",
    ],
  },
  {
    id: "parse",
    label: "Finding passport information",
    detail: [
      "reading full name & passport number",
      "reading date of birth & validity",
      "gathering address & parents' names",
    ],
  },
  {
    id: "verify",
    label: "Checking details & filling form",
    detail: [
      "verifying dates and numbers",
      "confirming accurate details",
      "ready for your review",
    ],
  },
];

const ACCURATE_INSURANCE_STEPS = [
  {
    id: "preprocess",
    label: "Preparing insurance paper",
    detail: [
      "reading uploaded policy pages",
      "enhancing text and table clarity",
      "identifying insurance company",
    ],
  },
  {
    id: "ocr",
    label: "Reading document text",
    detail: [
      "scanning policy pages",
      "locating vehicle & policy sections",
      "reading policyholder information",
    ],
  },
  {
    id: "parse",
    label: "Finding policy & vehicle details",
    detail: [
      "finding policy number & provider",
      "reading policyholder name & contact",
      "gathering vehicle number & engine specs",
    ],
  },
  {
    id: "verify",
    label: "Checking details & filling form",
    detail: [
      "verifying policy period & dates",
      "verifying vehicle details",
      "ready for your review",
    ],
  },
];


const DEMO_TICK_MS = 800;
const DEMO_REST_MS = 3200;


const advanceDemo = (steps, { step, line }) => {
  if (step >= steps.length) {
    return { step: 0, line: 0 };
  }
  const lineCount = steps[step].detail?.length ?? 0;
  return line < lineCount
    ? { step, line: line + 1 }
    : { step: step + 1, line: 0 };
};


function useDemoRun(enabled, rootRef, demoSteps = ACCURATE_PASSPORT_STEPS) {
  const [position, setPosition] = useState({ step: 0, line: 0 });
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = rootRef.current;
    if (!(enabled && element)) return;
    const observer = new IntersectionObserver(([entry]) =>
      setIsVisible(entry.isIntersecting)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, rootRef]);

  const positionRef = useRef(position);

  useEffect(() => {
    if (!(enabled && isVisible)) return;
    let id;
    const schedule = () => {
      const finished = positionRef.current.step >= demoSteps.length;
      id = setTimeout(
        () => {
          positionRef.current = advanceDemo(demoSteps, positionRef.current);
          setPosition(positionRef.current);
          schedule();
        },
        finished ? DEMO_REST_MS : DEMO_TICK_MS
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [enabled, isVisible, demoSteps]);

  return demoSteps.map((step, i) => {
    if (i < position.step) {
      return { ...step, status: "done", detail: [] };
    }
    if (i === position.step) {
      return {
        ...step,
        status: "running",
        detail: step.detail?.slice(0, position.line),
      };
    }
    return { ...step, status: "pending", detail: [] };
  });
}


function StepIcon({ status }) {
  return (
    <span className="kokonut-step-icon-wrap">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          animate={{ opacity: 1, filter: "blur(0px)" }}
          className="kokonut-step-icon-box"
          exit={{ opacity: 0, filter: "blur(2px)" }}
          initial={{ opacity: 0, filter: "blur(2px)" }}
          key={status}
          transition={{ duration: 0.18, ease: EASE_OUT }}
        >
          {status === "pending" && <span className="kokonut-dot-pending" />}
          {status === "running" && (
            <svg
              aria-hidden="true"
              className="kokonut-spinner-running"
              fill="none"
              viewBox="0 0 16 16"
            >
              <circle
                cx="8"
                cy="8"
                r="6.25"
                stroke="#d1d5db"
                strokeWidth="1.75"
              />
              <path
                d="M8 1.75a6.25 6.25 0 0 1 6.25 6.25"
                stroke="var(--accent, #315e48)"
                strokeLinecap="round"
                strokeWidth="1.75"
              />
            </svg>
          )}
          {status === "done" && (
            <svg
              aria-hidden="true"
              className="kokonut-check-done"
              fill="none"
              viewBox="0 0 16 16"
            >
              <motion.path
                animate={{ pathLength: 1 }}
                d="M3.5 8.5 6.5 11.5 12.5 4.5"
                initial={{ pathLength: 0 }}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
                transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.05 }}
              />
            </svg>
          )}
          {status === "error" && (
            <svg
              aria-hidden="true"
              className="kokonut-error-icon"
              fill="none"
              viewBox="0 0 16 16"
            >
              <path
                d="M4.5 4.5l7 7m0-7-7 7"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.9"
              />
            </svg>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function StepLog({ lines }) {
  if (!lines || !lines.length) return null;
  const offset = Math.max(0, lines.length - VISIBLE_LINES);
  return (
    <div
      aria-hidden="true"
      className="kokonut-step-log-wrap"
      style={{
        height: LINE_HEIGHT * Math.min(lines.length, VISIBLE_LINES),
        maskImage:
          lines.length > VISIBLE_LINES - 1
            ? "linear-gradient(to bottom, rgba(0,0,0,0.2), black 70%)"
            : undefined,
        WebkitMaskImage:
          lines.length > VISIBLE_LINES - 1
            ? "linear-gradient(to bottom, rgba(0,0,0,0.2), black 70%)"
            : undefined,
        transition: "height 240ms cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      <div
        className="kokonut-step-log-scroll"
        style={{ transform: `translateY(${-offset * LINE_HEIGHT}px)` }}
      >
        {lines.map((line, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="kokonut-log-row"
            initial={{ opacity: 0, y: 3 }}
            key={`${index}-${line}`}
            style={{ height: LINE_HEIGHT }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
          >
            <span className="kokonut-log-num">{index + 1}</span>
            <span className="kokonut-log-text">{line}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const formatDuration = (seconds) =>
  seconds < 60
    ? `${seconds}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toString().padStart(2, "0")}s`;

function useElapsed(active, done) {
  const [seconds, setSeconds] = useState(0);
  const startRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (done) finishedRef.current = true;
  }, [done]);

  useEffect(() => {
    if (!active) return;
    if (finishedRef.current) {
      finishedRef.current = false;
      startRef.current = null;
    }
    const start = startRef.current ?? Date.now();
    startRef.current = start;
    const tick = () => setSeconds(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [active]);

  return seconds;
}

function WaveText({ text }) {
  return (
    <>
      {Array.from(text).map((char, i) => (
        <span
          className="kokonut-ai-wave"
          key={i}
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          {char}
        </span>
      ))}
    </>
  );
}

const formatStepTime = (ms) =>
  ms < 10_000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`;

function useStepTimes(steps) {
  const [times, setTimes] = useState({});
  const startsRef = useRef({});

  useEffect(() => {
    const now = Date.now();
    const starts = startsRef.current;

    setTimes((prevTimes) => {
      let changed = false;
      const nextTimes = { ...prevTimes };

      for (const step of steps) {
        if (step.status === "pending") {
          if (starts[step.id]) {
            delete starts[step.id];
            delete nextTimes[step.id];
            changed = true;
          }
          continue;
        }
        if (step.status === "running") {
          if (!starts[step.id]) {
            starts[step.id] = now;
          }
        }
        if (step.status === "done" || step.status === "error") {
          if (nextTimes[step.id] === undefined) {
            const duration = starts[step.id] ? now - starts[step.id] : 500;
            nextTimes[step.id] = Math.max(300, duration);
            changed = true;
          }
        }
      }

      return changed ? nextTimes : prevTimes;
    });
  }, [steps]);

  return times;
}



function StepRow({ step, time, isLast }) {
  return (
    <li className="kokonut-step-row">
      {!isLast && (
        <span aria-hidden="true" className="kokonut-rail">
          <span
            className="kokonut-rail-fill"
            style={{
              transform: step.status === "done" ? "scaleY(1)" : "scaleY(0)",
            }}
          />
        </span>
      )}
      <StepIcon status={step.status} />
      <div className="kokonut-step-body">
        <div className="kokonut-step-header">
          <p className={cn("kokonut-step-label", step.status)}>
            {step.status === "running" ? (
              <>
                <span className="sr-only">{step.label}</span>
                <span aria-hidden="true">
                  <WaveText text={step.label} />
                </span>
              </>
            ) : (
              step.label
            )}
          </p>
          {time !== undefined && (
            <motion.span
              animate={{ opacity: 1 }}
              className="kokonut-step-time"
              initial={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {formatStepTime(time)}
            </motion.span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {step.status === "running" && step.detail?.length > 0 && (
            <motion.div
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              key="step-log-panel"
              style={{ overflow: "hidden" }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <StepLog lines={step.detail} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

export default function AILoadingState({
  steps: stepsProp,
  documentType = "PASSPORT",
  collapseWhenDone = true,
  className,
}) {
  const rootRef = useRef(null);
  const defaultSteps = documentType === "INSURANCE" ? ACCURATE_INSURANCE_STEPS : ACCURATE_PASSPORT_STEPS;
  const demoSteps = useDemoRun(stepsProp === undefined, rootRef, defaultSteps);
  const steps = stepsProp ?? demoSteps;
  const listId = useId();


  const running = steps.find((step) => step.status === "running");
  const failed = steps.find((step) => step.status === "error");
  const isDone = steps.length > 0 && steps.every((step) => step.status === "done");
  const isActive = Boolean(running);
  const seconds = useElapsed(isActive, isDone);
  const times = useStepTimes(steps);

  const [isOpen, setIsOpen] = useState(true);

  // Automatically collapse after completing, with a slight delay so user sees completion
  useEffect(() => {
    if (isDone && collapseWhenDone) {
      const timer = setTimeout(() => {
        setIsOpen(false);
      }, 700);
      return () => clearTimeout(timer);
    } else if (isActive) {
      setIsOpen(true);
    }
  }, [isDone, isActive, collapseWhenDone]);

  let title = "Getting ready...";
  if (failed) {
    title = `Stopped at: ${failed.label}`;
  } else if (isDone) {
    title = `Extracted in ${formatDuration(seconds)}`;
  } else if (running) {
    title = running.label;
  }

  return (
    <div className={cn("kokonut-ai-container", className)} ref={rootRef}>
      <MotionConfig reducedMotion="user">
        <div className="kokonut-ai-card">
          <button
            aria-controls={listId}
            aria-expanded={isOpen}
            className="kokonut-header-btn"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            <div className="kokonut-header-left">
              <output className="kokonut-header-title">{title}</output>
            </div>
            <div className="kokonut-header-right">
              {isActive && (
                <span className="kokonut-header-timer">
                  {formatDuration(seconds)}
                </span>
              )}
              {isDone && (
                <span className="kokonut-header-count">
                  {steps.length} steps completed
                </span>
              )}
              <ChevronDown
                aria-hidden="true"
                className={cn("kokonut-chevron", isOpen && "is-open")}
              />
            </div>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ol
                animate={{ height: "auto", opacity: 1 }}
                className="kokonut-steps-list"
                exit={{ height: 0, opacity: 0 }}
                id={listId}
                initial={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT }}
              >
                {steps.map((step, i) => (
                  <StepRow
                    isLast={i === steps.length - 1}
                    key={step.id}
                    step={step}
                    time={times[step.id]}
                  />
                ))}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </div>
  );
}

/**
 * IOF v3 — STATION 2 (FINAL UNIVERSAL BUILD)
 * --------------------------------------------------
 * Portable • Deterministic • AI-Readable • Modular
 * --------------------------------------------------
 * "The right frequency changes everything."
 */

// ─────────────────────────────────────────────
// 🔹 CORE CONSTANTS
// ─────────────────────────────────────────────
const IOF_CONSTANTS = {
  MAX_VELOCITY: 2,
  SPRING: 2.0,
  DAMPING: 0.92,
  STEP: 0.12,
  KICK: 0.08
};

// ─────────────────────────────────────────────
// 🔹 PALINDROME BUFFER (AI-READABLE MEMORY)
// ─────────────────────────────────────────────
class PalindromeBuffer {
  constructor(capacity = 128) {
    this.capacity = capacity;
    this.primary = new Array(capacity);
    this.mirror = new Array(capacity);
    this.cursor = 0;
  }

  classifyIntent(reason) {
    if (!reason) return "unknown";
    if (reason.includes("manual")) return "user_input";
    if (reason.includes("auto")) return "system";
    return "external";
  }

  write(key, value, prev, reason = "system") {
    const ts = performance.now();

    const delta = {
      key,
      from: prev,
      to: value,
      delta: (typeof value === "number" && typeof prev === "number") ? value - prev : null,
      intent: this.classifyIntent(reason),
      reason,
      ts,
      idx: this.cursor
    };

    this.primary[this.cursor % this.capacity] = { key, value, ts };
    this.mirror[this.cursor % this.capacity] = delta;

    this.cursor++;
    return delta;
  }

  read(n = 25) {
    const out = [];
    const start = Math.max(0, this.cursor - n);
    for (let i = start; i < this.cursor; i++) {
      const d = this.mirror[i % this.capacity];
      if (d) out.push(d);
    }
    return out;
  }
}

// ─────────────────────────────────────────────
// 🔹 FLUX ENGINE (DETERMINISTIC CORE)
// ─────────────────────────────────────────────
class FluxEngine {
  constructor(seedState) {
    this.values = seedState || { F: 0.72, L: 0.45, U: 0.88, X: 0.61 };
    this.targets = { ...this.values };
    this.velocity = Object.fromEntries(Object.keys(this.values).map(k => [k, 0]));

    this.buffer = new PalindromeBuffer(128);
    this.subscribers = new Set();

    this.lastTime = performance.now();
    this.running = false;
  }

  // ───── Subscription Layer ─────
  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  notify() {
    const snapshot = this.getState();
    this.subscribers.forEach(fn => fn(snapshot));
  }

  // ───── Core State ─────
  getState() {
    return {
      values: { ...this.values },
      targets: { ...this.targets },
      deltas: this.buffer.read(20),
      overall: this.getOverall(),
      resonance: this.getResonance(),
      timestamp: performance.now()
    };
  }

  getOverall() {
    const vals = Object.values(this.values);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  getResonance() {
    const vals = Object.values(this.values);
    const mean = this.getOverall();
    const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length;
    return 1 - Math.min(1, variance * 4);
  }

  // ───── Input Layer ─────
  nudge(key, dir = 1, reason = "manual-nudge") {
    const prev = this.targets[key];
    const next = Math.max(0, Math.min(1, prev + dir * IOF_CONSTANTS.STEP));

    this.targets[key] = next;
    this.velocity[key] += dir * IOF_CONSTANTS.KICK;

    this.buffer.write(key, next, prev, reason);
    this.notify();
  }

  setTarget(key, value, reason = "external-set") {
    const prev = this.targets[key];
    this.targets[key] = Math.max(0, Math.min(1, value));
    this.buffer.write(key, this.targets[key], prev, reason);
    this.notify();
  }

  // ───── Simulation Loop ─────
  step(dt) {
    for (const key in this.values) {
      const dist = this.targets[key] - this.values[key];

      const spring = dist * IOF_CONSTANTS.SPRING;
      const damping = this.velocity[key] * IOF_CONSTANTS.DAMPING;

      this.velocity[key] += (spring - damping) * dt;

      // Clamp velocity
      this.velocity[key] = Math.max(
        -IOF_CONSTANTS.MAX_VELOCITY,
        Math.min(IOF_CONSTANTS.MAX_VELOCITY, this.velocity[key])
      );

      this.values[key] += this.velocity[key] * dt;

      // Clamp value
      this.values[key] = Math.max(0, Math.min(1, this.values[key]));
    }
  }

  loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.step(dt);
    this.notify();

    requestAnimationFrame(this.loop);
  };

  start() {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.loop();
    }
  }

  stop() {
    this.running = false;
  }
}

// ─────────────────────────────────────────────
// 🔹 UNIVERSAL PROTOCOL (AI INTEROP)
// ─────────────────────────────────────────────
const IOF_PROTOCOL = {
  name: "IOFv3",
  version: "3.0",
  schema: {
    values: "0..1 normalized axes",
    targets: "desired state",
    deltas: "change log with intent",
    resonance: "system coherence metric"
  },
  actions: ["nudge", "setTarget", "subscribe"]
};

// ─────────────────────────────────────────────
// 🔹 OPTIONAL REACT UI (PLUG-IN)
// ─────────────────────────────────────────────
export function createIOFReactComponent(React) {
  const { useState, useEffect, useRef } = React;

  return function IOFDashboard() {
    const engineRef = useRef(new FluxEngine());
    const [state, setState] = useState(engineRef.current.getState());

    useEffect(() => {
      const engine = engineRef.current;
      const unsub = engine.subscribe(setState);
      engine.start();
      return () => { unsub(); engine.stop(); };
    }, []);

    const AXES = ["F", "L", "U", "X"];

    return React.createElement("div", { style: { padding: 20, fontFamily: "monospace", background: "#0a0a0a", color: "#fff" } },
      AXES.map(k =>
        React.createElement("div", { key: k },
          `${k}: ${(state.values[k] * 100).toFixed(1)}% `,
          React.createElement("button", { onClick: () => engineRef.current.nudge(k, -1) }, "-"),
          React.createElement("button", { onClick: () => engineRef.current.nudge(k, 1) }, "+")
        )
      ),
      React.createElement("div", null, `Resonance: ${(state.resonance * 100).toFixed(1)}%`)
    );
  };
}

// ─────────────────────────────────────────────
// 🔹 AUTO-BOOT (BROWSER SAFE)
// ─────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.IOFv3 = {
    FluxEngine,
    PalindromeBuffer,
    PROTOCOL: IOF_PROTOCOL
  };
}

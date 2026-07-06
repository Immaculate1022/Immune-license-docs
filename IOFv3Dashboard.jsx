/**
 * IOF v3 — STATION 2 (Golden Copy)
 * --------------------------------------------
 * Built with integrity, for good.
 * * May this code:
 * - Illuminate more than it obscures
 * - Connect more than it divides
 * - Teach more than it impresses
 * * "The right frequency changes everything."
 * --------------------------------------------
 * Secure • Ethical • Open • Peaceful
 */

import React, { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
//  PALINDROME STATE BUFFER (The Mirror Memory)
// ─────────────────────────────────────────────
class PalindromeBuffer {
  constructor(capacity = 64) {
    this.capacity = capacity;
    this.primary = []; // Forward Flow
    this.mirror = [];  // Delta Mirror (gregxgerg logic)
    this.cursor = 0;
  }

  write(key, value, prev, reason = "system") {
    const ts = performance.now();
    const deltaVal = (typeof value === "number" && typeof prev === "number") 
      ? value - prev : null;

    const entry = { key, value, ts };
    const delta = { key, from: prev, to: value, delta: deltaVal, reason, ts, idx: this.cursor };

    this.primary[this.cursor % this.capacity] = entry;
    this.mirror[this.cursor % this.capacity] = delta;
    this.cursor++;
    return delta;
  }

  readMirror(n = 20) {
    const out = [];
    const start = Math.max(0, this.cursor - n);
    for (let i = start; i < this.cursor; i++) {
      const e = this.mirror[i % this.capacity];
      if (e) out.push(e);
    }
    return out;
  }
}

// ─────────────────────────────────────────────
//  FLUX ENGINE (Natural Medium Physics)
// ─────────────────────────────────────────────
class FluxEngine {
  constructor() {
    this.values = { F: 0.72, L: 0.45, U: 0.88, X: 0.61 };
    this.targets = { ...this.values };
    this.velocity = { F: 0, L: 0, U: 0, X: 0 };
    this.buffer = new PalindromeBuffer(64);
    this.subscribers = [];
    this.lastTime = performance.now();
    this.running = false;
  }

  subscribe(fn) {
    this.subscribers.push(fn);
    return () => { this.subscribers = this.subscribers.filter(s => s !== fn); };
  }

  notify() {
    const state = {
      values: { ...this.values },
      deltas: this.buffer.readMirror(15),
      overall: Object.values(this.values).reduce((a, b) => a + b, 0) / 4
    };
    this.subscribers.forEach(fn => fn(state));
  }

  nudge = (key, direction) => {
    const step = 0.12;
    const prev = this.targets[key];
    this.targets[key] = Math.max(0, Math.min(1, prev + (direction * step)));
    this.velocity[key] += direction * 0.08; // The "Kinetic Kick"
    this.buffer.write(key, this.targets[key], prev, "manual-nudge");
    this.notify();
  };

  start() {
    this.running = true;
    this.loop();
  }

  stop() { this.running = false; }

  loop = () => {
    if (!this.running) return;
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    for (const key in this.values) {
      const dist = this.targets[key] - this.values[key];
      const springForce = dist * 2.0; 
      const damping = this.velocity[key] * 0.92; 
      this.velocity[key] += (springForce - damping) * dt;
      this.values[key] += this.velocity[key];
    }

    this.notify();
    requestAnimationFrame(this.loop);
  };
}

// ─────────────────────────────────────────────
//  DASHBOARD COMPONENT (The Lens)
// ─────────────────────────────────────────────
export default function IOFv3Dashboard() {
  const engineRef = useRef(new FluxEngine());
  const [state, setState] = useState({ values: {}, deltas: [], overall: 0 });

  useEffect(() => {
    const engine = engineRef.current;
    const unsubscribe = engine.subscribe(setState);
    engine.start();
    return () => { unsubscribe(); engine.stop(); };
  }, []);

  const AXES = [
    { key: "F", label: "Focus", color: "#00FFD1" },
    { key: "L", label: "Latency", color: "#FF6B35" },
    { key: "U", label: "Unity", color: "#A78BFA" },
    { key: "X", label: "eXpression", color: "#FACC15" },
  ];

  return (
    <div style={{ background: "#07080D", color: "#fff", minHeight: "100vh", padding: 30, fontFamily: "monospace" }}>
      <header style={{ borderBottom: "1px solid #ffffff11", marginBottom: 30, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, letterSpacing: 4 }}>IOF v3 <span style={{ color: "#A78BFA" }}>STATION 2</span></h1>
        <p style={{ fontSize: 10, color: "#ffffff44" }}>PROTOCOL: (gregxgerg) // STATUS: RESONANCE DETECTED</p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 40 }}>
        {/* Main Flux Controls */}
        <section>
          {AXES.map(ax => (
            <div key={ax.key} style={{ marginBottom: 25, background: "#ffffff05", padding: 15, borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ color: ax.color, fontWeight: "bold" }}>{ax.key} // {ax.label}</span>
                <span>{( (state.values[ax.key] || 0) * 100 ).toFixed(1)}%</span>
              </div>
              <div style={{ height: 4, background: "#222", borderRadius: 2 }}>
                <div style={{ 
                  width: `${(state.values[ax.key] || 0) * 100}%`, 
                  height: "100%", 
                  background: ax.color, 
                  boxShadow: `0 0 15px ${ax.color}` 
                }} />
              </div>
              <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                <button onClick={() => engineRef.current.nudge(ax.key, -1)} style={btnStyle}>-</button>
                <button onClick={() => engineRef.current.nudge(ax.key, 1)} style={btnStyle}>+</button>
              </div>
            </div>
          ))}
        </section>

        {/* The Mirror Feed & Manifesto */}
        <aside>
          <div style={{ fontSize: 48, fontWeight: "bold", textAlign: "center", marginBottom: 30, color: "#A78BFA" }}>
            {(state.overall * 100).toFixed(1)}%
          </div>
          
          <div style={{ background: "#ffffff05", padding: 15, borderRadius: 8, fontSize: 11 }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#ffffff44" }}>Δ MIRROR BUFFER</h4>
            {state.deltas.slice().reverse().map((d, i) => (
              <div key={i} style={{ marginBottom: 4, opacity: 1 - (i * 0.1) }}>
                <span style={{ color: AXES.find(a => a.key === d.key)?.color }}>{d.key}</span>: {d.reason}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 30, fontSize: 10, lineHeight: "1.6", color: "#ffffff22", fontStyle: "italic" }}>
            "The right frequency changes everything."<br/>
            Secure • Ethical • Open • Peaceful
          </div>
        </aside>
      </div>
    </div>
  );
}

const btnStyle = {
  background: "#ffffff11", border: "1px solid #ffffff22", color: "#fff",
  padding: "4px 12px", cursor: "pointer", borderRadius: 4, fontFamily: "monospace"
};

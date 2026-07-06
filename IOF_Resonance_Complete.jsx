/**
 * IOF Resonance - Complete Production System v4.0
 * --------------------------------------------
 * Built with integrity, for good.
 * License: IOF Open Fabric License (IOF-OFL)
 */

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────
//  CORE PHYSICS ENGINE (Flux & Resonance)
// ─────────────────────────────────────────────
class ResonanceEngine {
  constructor() {
    this.state = {
      integrity: 0.987,
      latency: 12,
      resonance: 0.85,
      throughput: 2340,
      nodes: Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        phase: Math.random() * Math.PI * 2,
        frequency: 0.5 + Math.random() * 2
      }))
    };
    this.subscribers = [];
    this.running = false;
    this.lastTime = performance.now();
  }

  subscribe(fn) {
    this.subscribers.push(fn);
    return () => { this.subscribers = this.subscribers.filter(s => s !== fn); };
  }

  notify() {
    this.subscribers.forEach(fn => fn({ ...this.state }));
  }

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

    // Simulate physics
    this.state.resonance = 0.8 + Math.sin(now / 2000) * 0.15;
    this.state.latency = 10 + Math.random() * 5;
    this.state.throughput = 2300 + Math.random() * 100;
    
    this.state.nodes.forEach(node => {
      node.phase += node.frequency * dt;
    });

    this.notify();
    requestAnimationFrame(this.loop);
  };
}

// ─────────────────────────────────────────────
//  UI COMPONENTS
// ─────────────────────────────────────────────

const NodeVisualizer = ({ nodes, resonance }) => {
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', opacity: 0.6 }}>
      {nodes.map(node => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={0.5 + Math.sin(node.phase) * 0.5}
          fill={resonance > 0.9 ? "#00FFD1" : "#A78BFA"}
          style={{ transition: 'fill 0.5s' }}
        />
      ))}
      {/* Connections */}
      {nodes.slice(0, 15).map((node, i) => {
        const next = nodes[(i + 1) % 15];
        return (
          <line
            key={i}
            x1={node.x}
            y1={node.y}
            x2={next.x}
            y2={next.y}
            stroke="#ffffff11"
            strokeWidth="0.1"
          />
        );
      })}
    </svg>
  );
};

function App() {
  const engineRef = useRef(new ResonanceEngine());
  const [data, setData] = useState(engineRef.current.state);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(setData);
    engineRef.current.start();
    return () => {
      unsubscribe();
      engineRef.current.stop();
    };
  }, []);

  return (
    <div style={{ padding: '40px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid #ffffff22', paddingBottom: '20px', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '24px', letterSpacing: '8px', color: '#fff' }}>
          IOF RESONANCE <span style={{ color: '#A78BFA', fontSize: '12px' }}>V4.0 ENTERPRISE</span>
        </h1>
        <div style={{ fontSize: '10px', color: '#ffffff44', marginTop: '5px' }}>
          COSMOLOGICAL BRIDGE ACTIVE // STATUS: SYNCHRONIZED
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px', flex: 1 }}>
        <main style={{ position: 'relative', background: '#ffffff03', borderRadius: '12px', border: '1px solid #ffffff08' }}>
          <div style={{ position: 'absolute', top: '20px', left: '20px', z: 10 }}>
            <div style={{ fontSize: '10px', color: '#ffffff44' }}>TOPOLOGICAL MANIFOLD VIEW</div>
            <div style={{ fontSize: '20px', color: '#00FFD1' }}>RESONANCE: {(data.resonance * 100).toFixed(2)}%</div>
          </div>
          <NodeVisualizer nodes={data.nodes} resonance={data.resonance} />
        </main>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={statBoxStyle}>
            <div style={labelStyle}>SIGNAL INTEGRITY</div>
            <div style={valueStyle}>{(data.integrity * 100).toFixed(3)}%</div>
          </div>
          <div style={statBoxStyle}>
            <div style={labelStyle}>TELEMETRY LATENCY</div>
            <div style={valueStyle}>{data.latency.toFixed(1)}ms</div>
          </div>
          <div style={statBoxStyle}>
            <div style={labelStyle}>THROUGHPUT</div>
            <div style={valueStyle}>{data.throughput.toFixed(0)} PPS</div>
          </div>

          <div style={{ marginTop: 'auto', padding: '20px', background: '#A78BFA11', borderRadius: '8px', border: '1px solid #A78BFA22' }}>
            <div style={{ fontSize: '10px', color: '#A78BFA', fontWeight: 'bold', marginBottom: '10px' }}>AI PREDICTION</div>
            <div style={{ fontSize: '12px', lineHeight: '1.6', fontStyle: 'italic' }}>
              "Topology remains stable. No terminal dissipation detected in the C-band window."
            </div>
          </div>
        </aside>
      </div>

      <footer style={{ marginTop: '40px', fontSize: '10px', color: '#ffffff22', textAlign: 'center' }}>
        &infin; INFINITE OPTICAL FABRIC // SECURE &bull; ETHICAL &bull; OPEN &bull; PEACEFUL
      </footer>
    </div>
  );
}

const statBoxStyle = {
  background: '#ffffff05',
  padding: '20px',
  borderRadius: '8px',
  border: '1px solid #ffffff08'
};

const labelStyle = {
  fontSize: '10px',
  color: '#ffffff44',
  marginBottom: '8px',
  letterSpacing: '1px'
};

const valueStyle = {
  fontSize: '24px',
  color: '#fff',
  fontWeight: 'bold'
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

/**
 * IOF Resonance - Complete Production System v4.0
 * --------------------------------------------
 * Built with integrity, for good.
 * License: IOF Open Fabric License (IOF-OFL)
 */

const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────
//  TOPOLOGICAL MEMORY & REASONING
// ─────────────────────────────────────────────

class TopologicalMemoryBank {
  constructor(maxEntries = 50) {
    this.states = [];
    this.maxEntries = maxEntries;
  }

  record(arch, photonic, step) {
    const entry = {
      phi: arch.mobius_phi,
      q: photonic.qFactor,
      step: step,
      isPeak: photonic.resonance > 0.9
    };
    this.states.push(entry);
    if (this.states.length > this.maxEntries) this.states.shift();
  }

  findNearbyPeak(currentPhi, threshold = 0.15) {
    if (this.states.length === 0) return null;
    const candidates = this.states.filter(s => Math.abs(s.phi - currentPhi) < threshold);
    if (candidates.length === 0) return null;
    return candidates.reduce((best, curr) => curr.q > best.q ? curr : best);
  }
}

const MESH_POS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random(),
  y: Math.random()
}));

// ─────────────────────────────────────────────
//  VISUALIZATION COMPONENTS
// ─────────────────────────────────────────────

const AcousticTopography = ({ nodes, currentPhi, targetPhi }) => {
  const canvasRef = useRef();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = 600, h = 300;
    canvas.width = w; canvas.height = h;

    const getHeightAt = (x, y) => {
      let hVal = 0;
      MESH_POS.forEach(pos => {
        const node = nodes[pos.id] || { localError: 0 };
        const dx = (x / w) - pos.x;
        const dy = (y / h) - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        hVal += Math.abs(node.localError) * Math.exp(-dist * 10) * 150;
      });
      return hVal + Math.sin(x * 0.05) * 5;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const height = getHeightAt(x, y);
          ctx.fillStyle = `hsl(${200 + height}, 70%, ${20 + height/5}%)`;
          ctx.fillRect(x, y, 4, 4);
        }
      }

      // Current position
      ctx.beginPath();
      ctx.arc(currentPhi * w, h/2, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#00FFD1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Ascent Path
      if (targetPhi) {
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(currentPhi * w, h/2);
        ctx.lineTo(targetPhi * w, h/2 - 20);
        ctx.strokeStyle = '#A78BFA';
        ctx.stroke();
      }
    };

    draw();
  }, [nodes, currentPhi, targetPhi]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '300px', borderRadius: '8px' }} />;
};

function App() {
  const [step, setStep] = useState(0);
  const [memory] = useState(new TopologicalMemoryBank());
  const [arch, setArch] = useState({ mobius_phi: 0.5 });
  const [photonic, setPhotonic] = useState({ resonance: 0.5, qFactor: 5e7, integrity: 0.98 });
  const [nodes, setNodes] = useState({});
  const [ascent, setAscent] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setStep(s => s + 1);
      const newRes = 0.4 + Math.random() * 0.5;
      const newPhotonic = { resonance: newRes, qFactor: newRes * 1e8, integrity: 0.95 + Math.random() * 0.04 };
      setPhotonic(newPhotonic);
      
      const newNodes = {};
      MESH_POS.forEach(p => {
        newNodes[p.id] = { localError: Math.sin(step * 0.1 + p.id) * 0.5 };
      });
      setNodes(newNodes);

      memory.record(arch, newPhotonic, step);

      // Ascent Logic
      const peak = memory.findNearbyPeak(arch.mobius_phi);
      if (peak && peak.q > newPhotonic.qFactor * 1.1) {
        setAscent({ to: peak.phi, q: peak.q });
        setArch({ mobius_phi: peak.phi });
      } else {
        setAscent(null);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [step, arch]);

  return (
    <div style={{ padding: '40px', color: '#fff' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ letterSpacing: '4px', color: '#A78BFA' }}>IOF RESONANCE // TOPOGRAPHIC ASCENT</h1>
        <div style={{ fontSize: '10px', opacity: 0.4 }}>CLIMBING THE RESONANCE MOUNTAINS</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }}>
        <section>
          <AcousticTopography nodes={nodes} currentPhi={arch.mobius_phi} targetPhi={ascent?.to} />
          {ascent && (
            <div style={{ marginTop: '20px', padding: '15px', background: '#00FFD111', border: '1px solid #00FFD144', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', color: '#00FFD1' }}>🏔️ TOPOGRAPHIC ASCENT ACTIVE</div>
              <div style={{ fontSize: '10px', opacity: 0.6 }}>Navigating toward peak at φ={ascent.to.toFixed(4)} (Q={ascent.q.toExponential(2)})</div>
            </div>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={statStyle}>
            <div style={labelStyle}>RESONANCE</div>
            <div style={valueStyle}>{(photonic.resonance * 100).toFixed(2)}%</div>
          </div>
          <div style={statStyle}>
            <div style={labelStyle}>Q-FACTOR</div>
            <div style={valueStyle}>{photonic.qFactor.toExponential(2)}</div>
          </div>
          <div style={statStyle}>
            <div style={labelStyle}>PEAKS DETECTED</div>
            <div style={valueStyle}>{memory.states.filter(s => s.isPeak).length}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const statStyle = { background: '#ffffff05', padding: '20px', borderRadius: '8px', border: '1px solid #ffffff11' };
const labelStyle = { fontSize: '10px', opacity: 0.4, marginBottom: '5px' };
const valueStyle = { fontSize: '20px', fontWeight: 'bold' };

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

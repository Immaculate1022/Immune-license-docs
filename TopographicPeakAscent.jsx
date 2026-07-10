// ============================================
// ENHANCED TOPOLOGICAL MEMORY WITH PEAK DETECTION
// ============================================

class TopologicalMemoryBank {
  constructor(maxEntries = 10, decayRate = 0.01) {
    this.states = [];
    this.maxEntries = maxEntries;
    this.decayRate = decayRate;
    this.resonancePatterns = new Map();
    this.peakCache = new Map(); // Cache of detected peaks in phi space
  }

  // ... (previous methods remain)

  // Find nearby peak in topological landscape
  findNearbyPeak(currentPhi, threshold = 0.1) {
    if (this.states.length === 0) return null;
    
    // Look for states within phi neighborhood
    const candidates = this.states.filter(s => 
      Math.abs(s.phi - currentPhi) < threshold
    );
    
    if (candidates.length === 0) return null;
    
    // Return the one with highest Q-factor (the peak)
    return candidates.reduce((best, curr) => 
      curr.q > best.q ? curr : best
    );
  }

  // Find the global maximum in the topological landscape
  findGlobalPeak() {
    if (this.states.length === 0) return null;
    return this.states.reduce((best, curr) => 
      curr.q > best.q ? curr : best
    );
  }

  // Calculate gradient direction toward nearest peak
  calculateGradient(currentPhi) {
    const peak = this.findNearbyPeak(currentPhi, 0.3);
    if (!peak) return 0;
    
    // Direction vector toward peak
    return peak.phi - currentPhi;
  }
}

// ============================================
// ENHANCED REASONING WITH TOPOGRAPHIC ASCENT
// ============================================

function reasonWithMemory(arch, photonic, history, step, topologicalMemory, nodes) {
  const bestState = topologicalMemory.getBestState();
  const recentStates = topologicalMemory.getRecentStates(3);
  const resonance = photonic.resonance;
  const qFactor = photonic.qFactor;

  // ===== TOPOGRAPHIC ASCENT =====
  // Look for higher elevation peaks to climb
  const nearbyPeak = topologicalMemory.findNearbyPeak(arch.mobius_phi, 0.15);
  
  if (nearbyPeak && nearbyPeak.q > qFactor * 1.2) {
    return {
      diag: "topological_ascent",
      conf: 0.92,
      rationale: `🏔️ Detected higher elevation resonance summit at φ=${nearbyPeak.phi.toFixed(4)} (Q=${nearbyPeak.q.toExponential(2)}). Proposing ascent to maximize mode confinement.`,
      param: "mobius_phi",
      cur: arch.mobius_phi,
      nxt: nearbyPeak.phi,
      gradient: nearbyPeak.phi - arch.mobius_phi,
      peakHeight: nearbyPeak.q / 1e8,
      action: "ascent"
    };
  }

  // ===== PREDICTIVE THERMAL SHUNTING =====
  const projectedNodes = getProjectedState(nodes, 15);
  const futureThermalRisk = Object.values(projectedNodes).some(p => Math.abs(p.error) > 0.8);
  
  if (futureThermalRisk && !photonic.isConverged) {
    return {
      diag: "predictive_thermal_shunting",
      conf: 0.98,
      rationale: "🔥 Predictive Ghost detected imminent Power Wall breach in TFLN lattice. Shunting learning alpha to 0.01 to prevent mode collapse.",
      param: "alpha",
      cur: arch.alpha || 0.1,
      nxt: 0.01,
      urgent: true,
      thermalRisk: true,
      action: "shunt"
    };
  }

  // ===== STANDARD MEMORY RECALL =====
  if (resonance < 0.6 && bestState) {
    const instabilityTrend = detectInstabilityPattern(history);
    let result = {
      param: "mobius_phi",
      cur: arch.mobius_phi,
      action: "recall"
    };
    
    switch(instabilityTrend) {
      case 'oscillating':
        const harmonicState = findHarmonicLock(topologicalMemory.states, arch.mobius_phi);
        if (harmonicState) {
          result.diag = "harmonic_locking";
          result.conf = 0.95;
          result.rationale = `🎵 Detected oscillatory instability. Locking to harmonic of previous stable state (φ=${harmonicState.phi.toFixed(4)}).`;
          result.nxt = harmonicState.phi;
        }
        break;
        
      case 'thermal_drift':
        const avgPhi = recentStates.reduce((sum, s) => sum + s.phi, 0) / recentStates.length;
        result.diag = "ensemble_recall";
        result.conf = 0.85;
        result.rationale = `🌡️ Thermal drift detected. Recalling ensemble average from ${recentStates.length} previous stable states.`;
        result.nxt = avgPhi;
        break;
        
      default:
        result.diag = "memory_recall_alignment";
        result.conf = 0.9;
        result.rationale = `📡 Current mode unstable. Recalling optimized state from step ${bestState.step} (Q=${bestState.q.toExponential(1)}). Re-aligning to known topological peak.`;
        result.nxt = bestState.phi;
    }
    
    const stepsSinceBest = step - bestState.step;
    if (stepsSinceBest > 100) {
      result.conf *= Math.exp(-stepsSinceBest / 500);
      result.rationale += ` (confidence adjusted: old memory, ${stepsSinceBest} steps old)`;
    }
    
    return result;
  }
  
  return null;
}

// ============================================
// TOPOGRAPHIC VISUALIZATION COMPONENT
// ============================================

function TopographicAscentIndicator({ currentPhi, targetPhi, gradient, peakHeight }) {
  const progress = targetPhi ? 
    Math.min(Math.abs(currentPhi - targetPhi) / Math.abs(gradient || 1), 1) : 0;
  
  return (
    <div style={{
      marginTop: 10,
      padding: 8,
      background: '#03030c',
      borderRadius: 4,
      border: '1px solid #00f5d440',
      fontSize: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ color: '#00f5d4' }}>🏔️ TOPOGRAPHIC ASCENT</span>
        <span style={{ color: '#666' }}>→ {targetPhi?.toFixed(4)}</span>
      </div>
      
      {/* Ascent progress bar */}
      <div style={{ 
        height: 3, 
        background: '#1a1a2a', 
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 4
      }}>
        <div style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #00f5d4, #7b2fff)',
          boxShadow: '0 0 10px #00f5d4',
          transition: 'width 0.3s ease'
        }} />
      </div>
      
      {/* Peak info */}
      {peakHeight && (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#666' }}>
          <span>Current Q: {(currentPhi * 100).toFixed(1)}%</span>
          <span>Target Peak: {(peakHeight * 100).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// ENHANCED 3D TOPOGRAPHY WITH ASCENT PATH
// ============================================

function AcousticTopographyWithAscent({ nodes, coherence, currentPhi, targetPhi, onPeakDetect }) {
  const canvasRef = React.useRef();
  const animationRef = React.useRef();
  const [peaks, setPeaks] = React.useState([]);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = 600, h = 300;
    
    canvas.width = w;
    canvas.height = h;
    
    const getHeightAt = (x, y) => {
      let height = 0;
      let totalWeight = 0;
      
      Object.entries(MESH_POS).forEach(([id, pos]) => {
        const node = nodes[id] || { localError: 0, amplitude: 0.5 };
        
        const dx = (x / w) - pos.x;
        const dy = (y / h * 0.6) - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const influence = Math.exp(-dist * 8) * (node.amplitude || 0.5);
        
        height += Math.abs(node.localError) * influence * 200;
        totalWeight += influence;
      });
      
      const noise = Math.sin(x * 0.05) * Math.sin(y * 0.03) * 10;
      return (height / (totalWeight || 1)) + noise;
    };
    
    const detectPeaks = () => {
      const newPeaks = [];
      const step = 20;
      
      for (let x = step; x < w; x += step) {
        for (let y = step; y < h; y += step) {
          const h0 = getHeightAt(x, y);
          const h1 = getHeightAt(x + step, y);
          const h2 = getHeightAt(x - step, y);
          const h3 = getHeightAt(x, y + step);
          const h4 = getHeightAt(x, y - step);
          
          if (h0 > h1 && h0 > h2 && h0 > h3 && h0 > h4 && h0 > 30) {
            newPeaks.push({ x, y, height: h0 });
          }
        }
      }
      
      setPeaks(newPeaks);
      onPeakDetect?.(newPeaks);
    };
    
    const animate = () => {
      ctx.clearRect(0, 0, w, h);
      
      // Draw height field
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const height = getHeightAt(x, y);
          const hue = 180 + (height / 100) * 180;
          ctx.fillStyle = `hsl(${hue}, 80%, ${30 + height/200 * 40}%)`;
          ctx.fillRect(x, y, 2, 2);
        }
      }
      
      // Draw ascent path if target exists
      if (targetPhi && currentPhi) {
        const startX = currentPhi * w;
        const targetX = targetPhi * w;
        
        ctx.beginPath();
        ctx.moveTo(startX, 150);
        ctx.lineTo(targetX, 100); // Peak is higher
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        
        // Draw arrow at end
        ctx.beginPath();
        ctx.moveTo(targetX - 5, 95);
        ctx.lineTo(targetX, 100);
        ctx.lineTo(targetX - 5, 105);
        ctx.strokeStyle = '#00f5d4';
        ctx.setLineDash([]);
        ctx.stroke();
      }
      
      // Mark peaks
      peaks.forEach(peak => {
        ctx.beginPath();
        ctx.arc(peak.x, peak.y, 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#00f5d4';
        ctx.font = '6px monospace';
        ctx.fillText(`${Math.round(peak.height)}`, peak.x + 8, peak.y - 8);
      });
      
      // Mark current position
      if (currentPhi) {
        ctx.beginPath();
        ctx.arc(currentPhi * w, 150, 8, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffd60a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    detectPeaks();
    animate();
    
    return () => cancelAnimationFrame(animationRef.current);
  }, [nodes, coherence, currentPhi, targetPhi, onPeakDetect]);
  
  return (
    <div style={{
      perspective: '1000px',
      transformStyle: 'preserve-3d',
      width: '100%',
      height: '350px',
      marginTop: '20px',
      marginBottom: '20px',
      overflow: 'hidden',
      background: '#02020a',
      borderRadius: '8px',
      border: '1px solid #1a1a2a',
      position: 'relative'
    }}>
      <div style={{
        transform: 'rotateX(60deg) rotateZ(-15deg) scale(1.2)',
        width: '100%',
        height: '100%',
        position: 'relative'
      }}>
        <canvas 
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            filter: 'drop-shadow(0 0 10px #7b2fff33)'
          }}
        />
        
        {/* Floating grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(90deg, #7b2fff20 1px, transparent 1px),
            linear-gradient(0deg, #7b2fff20 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'translateZ(10px)',
          opacity: 0.3,
          pointerEvents: 'none'
        }} />
      </div>
      
      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        fontSize: 7,
        color: '#666',
        background: '#03030c',
        padding: '4px 8px',
        borderRadius: 4,
        border: '1px solid #1a1a2a'
      }}>
        <span style={{ color: '#00f5d4' }}>▲</span> PEAKS ({peaks.length}) // 
        <span style={{ color: '#ffd60a', marginLeft: 6 }}>◉</span> CURRENT
        {targetPhi && <span style={{ color: '#00f5d4', marginLeft: 6 }}>→ ASCENT</span>}
      </div>
      
      <div style={{ 
        fontSize: 8, 
        color: '#444', 
        textAlign: 'center', 
        marginTop: 10,
        position: 'absolute',
        bottom: -25,
        left: 0,
        right: 0
      }}>
        3D TOPOLOGICAL LANDSCAPE // ARROW SHOWS ASCENT PATH
      </div>
    </div>
  );
}

// ============================================
// MAIN DASHBOARD WITH TOPOGRAPHIC ASCENT
// ============================================

function PhotonicDashboardWithTopographicAscent() {
  const [memoryBank] = React.useState(() => new TopologicalMemoryBank());
  const [step, setStep] = React.useState(0);
  const [arch, setArch] = React.useState({ mobius_phi: 0.5, dim: 3, alpha: 0.1 });
  const [photonic, setPhotonic] = React.useState({
    coherence: 0.7,
    qFactor: 5e7,
    resonance: 0.5,
    dissipation: 2.5,
    isConverged: false
  });
  const [nodes, setNodes] = React.useState({});
  const [history, setHistory] = React.useState([]);
  const [lastRecall, setLastRecall] = React.useState(null);
  const [ascentTarget, setAscentTarget] = React.useState(null);
  
  // Animation loop
  React.useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => s + 1);
      
      // Update nodes
      setNodes(prev => {
        const newNodes = {};
        Object.keys(MESH_POS).forEach(id => {
          const t = Date.now() * 0.001;
          newNodes[id] = {
            localError: Math.sin(t + id.charCodeAt(0)) * 0.5,
            amplitude: 0.5 + Math.sin(t * 0.5 + id.charCodeAt(0)) * 0.3,
            prevErr: prev[id]?.localError || 0
          };
        });
        return newNodes;
      });
      
      // Update photonic state
      setPhotonic(prev => {
        const newCoherence = 0.5 + Math.sin(step * 0.1) * 0.3;
        const newResonance = 0.4 + Math.abs(Math.sin(step * 0.12)) * 0.5;
        const newQ = 1e8 * newResonance;
        
        return {
          ...prev,
          coherence: newCoherence,
          resonance: newResonance,
          qFactor: newQ,
          dissipation: 5.0 * (1.0 - Math.tanh(newQ / 1e7)),
          isConverged: Math.random() > 0.8
        };
      });
      
      setHistory(h => [...h.slice(-20), { resonance: photonic.resonance }]);
      
    }, 200);
    
    return () => clearInterval(interval);
  }, [step]);
  
  // Reasoning cycle
  React.useEffect(() => {
    const recall = reasonWithMemory(
      arch, 
      photonic, 
      history, 
      step, 
      memoryBank, 
      nodes
    );
    
    if (recall) {
      console.log('🧠 Memory Recall:', recall.rationale);
      setLastRecall(recall);
      
      setArch(prev => ({ 
        ...prev, 
        [recall.param]: recall.nxt 
      }));
      
      // Track ascent targets
      if (recall.action === 'ascent') {
        setAscentTarget({
          from: recall.cur,
          to: recall.nxt,
          peakHeight: recall.peakHeight
        });
        
        // Clear after reaching target
        setTimeout(() => setAscentTarget(null), 3000);
      }
    }
    
    if (photonic.isConverged) {
      memoryBank.record(arch, photonic, step);
    }
  }, [photonic, step, nodes]);
  
  return (
    <div style={{
      background: '#010108',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: 20,
      minHeight: '100vh'
    }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ 
          fontSize: 14, 
          fontWeight: 400, 
          color: '#7b2fff', 
          letterSpacing: 4,
          marginBottom: 20,
          textTransform: 'uppercase'
        }}>
          ⬢ TOPOGRAPHIC PHOTONIC COMPUTING // PEAK ASCENT
        </h1>
        
        {/* 3D Topography with ascent visualization */}
        <AcousticTopographyWithAscent 
          nodes={nodes}
          coherence={photonic.coherence}
          currentPhi={arch.mobius_phi}
          targetPhi={ascentTarget?.to}
          onPeakDetect={(peaks) => {
            // Record peaks in memory as potential targets
            peaks.forEach(peak => {
              // Convert pixel coordinates to phi space
              const phi = peak.x / 600;
              memoryBank.states.push({
                phi,
                q: 1e8 * (peak.height / 200),
                step,
                isPeak: true
              });
            });
          }}
        />
        
        {/* Ascent indicator */}
        {ascentTarget && (
          <TopographicAscentIndicator 
            currentPhi={arch.mobius_phi}
            targetPhi={ascentTarget.to}
            gradient={ascentTarget.to - arch.mobius_phi}
            peakHeight={ascentTarget.peakHeight}
          />
        )}
        
        {/* Last recall display */}
        {lastRecall && (
          <div style={{
            marginTop: 10,
            padding: 8,
            background: '#080814',
            borderRadius: 4,
            border: '1px solid #1a1a2a',
            fontSize: 8,
            color: '#888'
          }}>
            <span style={{ color: lastRecall.action === 'ascent' ? '#00f5d4' : '#7b2fff' }}>
              {lastRecall.action === 'ascent' ? '🏔️ ' : '🔄 '}
              {lastRecall.diag}
            </span>
            <div style={{ marginTop: 2, color: '#666' }}>
              {lastRecall.rationale}
            </div>
          </div>
        )}
        
        {/* Status bar */}
        <div style={{ 
          marginTop: 20, 
          fontSize: 8, 
          color: '#444', 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'center',
          gap: 20
        }}>
          <span>STEP {step}</span>
          <span>φ {arch.mobius_phi.toFixed(4)}</span>
          <span>Q {(photonic.qFactor / 1e8).toFixed(3)}</span>
          <span style={{ color: memoryBank.states.length > 0 ? '#00f5d4' : '#666' }}>
            🏔️ {memoryBank.states.filter(s => s.isPeak).length} PEAKS
          </span>
        </div>
      </div>
    </div>
  );
}

export {
  TopologicalMemoryBank,
  reasonWithMemory,
  TopographicAscentIndicator,
  AcousticTopographyWithAscent,
  PhotonicDashboardWithTopographicAscent
};
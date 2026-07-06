# Adaptive Hollow Reflector - Endpoint Edition

**A global immune system for endpoints. Free, real-time, behavioral defense against ransomware.**

Copyright 2026 Gregory Scott Davis  
Licensed under [Apache License 2.0](./LICENSE)

---

## Overview

Ransomware dwell time is 5-60 seconds. EDR response time is 30-300 seconds. That gap is where companies die.

AHR-Endpoint closes the gap with <2s global containment using ephemeral invariants, decoy rotation, and cross-host propagation scoring.

## How It Works

AHR treats attacks as "hollows" in system state-space. When a process exhibits ransomware behavior, AHR:

1. **Detects** - High entropy writes + VSS delete + C2 contact = `FileHollow{risk: 9}`
2. **Contains** - Drops a 60s `KILL_TREE` invariant on that process hash
3. **Immunizes** - Pushes the invariant to all 100k hosts in <2s via NATS
4. **Escalates** - `domain_admin` compromise? `REVOKE_SESSION` + page SOC

Result: Patient Zero loses files. Patient Two loses nothing.

## Key Features

- **Sub-2s Global Recalc**: Outbreak on host A protects host B before encryption starts
- **Graduated Response**: `SUSPEND_PROC` → `FLAG_FOR_HUMAN_REVIEW` → `KILL_TREE` → `ISOLATE_HOST`
- **Identity Fusion**: `REVOKE_SESSION` + `TRIGGER_MFA_REPROMPT` built into endpoint logic
- **Deception**: Rotating honeyfiles + honeycreds trip attackers and waste their time
- **Free Forever**: Apache 2.0. Use it, fork it, embed it. No EEE.

## Components

### IOF v3 Dashboard (Station 2)
The repository includes `IOFv3Dashboard.jsx`, a high-fidelity React component for monitoring flux, latency, and system resonance.

### The Cosmological Bridge
A technical document (`docs/CosmologicalBridge.md`) exploring the Infinite Optical Fabric as an implementation of cosmic principles, mapping galactic architecture to TFLN-based engineering.

## Project Structure

```text
.
├── docs/                   # Technical documentation and licenses
│   ├── AHR.pdf
│   ├── AHRengine.pdf
│   ├── CosmologicalBridge.md
│   └── Immunelicense.pdf
├── IOFv3Dashboard.jsx      # Station 2 Flux Dashboard (React)
├── LICENSE                 # Apache 2.0 License
├── README.md               # Project overview and quickstart
└── .gitignore              # Standard ignore rules
```

## Quickstart

```bash
git clone https://github.com/Immaculate1022/Immune-license-docs.git
cd Immune-license-docs
# To use the dashboard, import IOFv3Dashboard into your React app
```

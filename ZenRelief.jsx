import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Sparkles, RotateCcw, Volume2, VolumeX, Download, 
  Trash2, Paintbrush, Play, Pause, Sun, Trophy
} from 'lucide-react';

let globalAudioCtx = null;

const getActiveAudioContext = () => {
  try {
    if (!globalAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume();
    }
  } catch (e) {
    // Audio initialization fallback
  }
  return globalAudioCtx;
};

// Loud, ultra-satisfying, realistic balloon pop bursting sound
const playBalloonPopSound = (soundOn) => {
  if (!soundOn) return;
  try {
    const ctx = getActiveAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const t = ctx.currentTime;

    // 1. Loud Noise Burst (Crisp rubber membrane snap & air release)
    const bufferSize = Math.floor(ctx.sampleRate * 0.06); // 60ms burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, t);
    noiseFilter.Q.setValueAtTime(1.1, t);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(1.3, t); // Crisp and loud
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(t);

    // 2. Heavy Sub-Bass Pop Body (Physical balloon punch)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    const pitch = 270 + Math.random() * 80;
    osc.frequency.setValueAtTime(pitch, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.075);

    oscGain.gain.setValueAtTime(1.1, t); // High volume
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.085);
  } catch (err) {
    // Audio blocked
  }
};

const BALLOON_PALETTES = [
  { name: 'Sky Cyan', bg: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.45)' },
  { name: 'Lavender', bg: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.45)' },
  { name: 'Mint Leaf', bg: '#4ade80', border: '#16a34a', glow: 'rgba(74, 222, 128, 0.45)' },
  { name: 'Sunset Peach', bg: '#fb923c', border: '#ea580c', glow: 'rgba(251, 146, 60, 0.45)' },
  { name: 'Rose Pink', bg: '#f472b6', border: '#db2777', glow: 'rgba(244, 114, 182, 0.45)' },
  { name: 'Sunny Gold', bg: '#facc15', border: '#ca8a04', glow: 'rgba(250, 204, 21, 0.45)' },
  { name: 'Royal Indigo', bg: '#818cf8', border: '#4f46e5', glow: 'rgba(129, 140, 248, 0.45)' }
];

const INITIAL_WRAP_COUNT = 48;

export default function ZenRelief({ userName = 'Friend' }) {
  const [activeMode, setActiveMode] = useState('falling'); // 'falling' | 'wrap' | 'doodle'
  const [soundEnabled, setSoundEnabled] = useState(true);

  // ------------------ 1. FALLING BALLOONS GAME STATE ------------------
  const [balloons, setBalloons] = useState([]);
  const [poppedTotal, setPoppedTotal] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1); // 0.8 | 1 | 1.4
  const [particles, setParticles] = useState([]);
  const [floatingScores, setFloatingScores] = useState([]);

  const arenaRef = useRef(null);
  const nextBalloonId = useRef(1);
  const lastSpawnTime = useRef(Date.now());
  const animFrameId = useRef(null);

  // Unlock browser audio context on first click/touch
  useEffect(() => {
    const unlockAudio = () => {
      getActiveAudioContext();
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Stress Level decreases as you pop balloons
  const stressLevel = Math.max(5, Math.min(100, 100 - poppedTotal * 3));

  // Spawn a new falling balloon
  const spawnBalloon = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;

    const palette = BALLOON_PALETTES[Math.floor(Math.random() * BALLOON_PALETTES.length)];
    const size = Math.floor(Math.random() * 22) + 52; // 52px - 74px
    const x = Math.floor(Math.random() * 80) + 8; // 8% - 88% horizontally
    const speed = (1.1 + Math.random() * 0.9) * speedMultiplier;
    const sway = Math.random() * Math.PI * 2;

    const newBalloon = {
      id: nextBalloonId.current++,
      x,
      y: -95,
      size,
      speed,
      sway,
      color: palette,
      popped: false
    };

    setBalloons(prev => [...prev.slice(-24), newBalloon]);
  }, [speedMultiplier]);

  // Main Falling Animation Loop
  useEffect(() => {
    if (activeMode !== 'falling') return;

    const updateLoop = () => {
      if (isPlaying) {
        const now = Date.now();
        // Spawn frequency based on speed multiplier
        const spawnInterval = 900 / speedMultiplier;
        if (now - lastSpawnTime.current > spawnInterval) {
          spawnBalloon();
          lastSpawnTime.current = now;
        }

        // Update positions
        setBalloons(prev => 
          prev
            .map(b => ({ ...b, y: b.y + b.speed }))
            .filter(b => b.y < 530) // Remove balloons that drifted past bottom
        );

        // Clean up aged particles
        setParticles(prev => prev.filter(p => now - p.created < 600));
        setFloatingScores(prev => prev.filter(s => now - s.created < 800));
      }

      animFrameId.current = requestAnimationFrame(updateLoop);
    };

    animFrameId.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [activeMode, isPlaying, speedMultiplier, spawnBalloon]);

  // Handle Balloon Pop
  const handlePopBalloon = (e, balloon) => {
    e.stopPropagation();
    if (balloon.popped) return;

    playBalloonPopSound(soundEnabled);
    setPoppedTotal(p => p + 1);

    // Get click coords for confetti particles & float text
    const arena = arenaRef.current?.getBoundingClientRect();
    const clickX = e.clientX ? (e.clientX - (arena?.left || 0)) : (balloon.x * (arena?.width || 300) / 100);
    const clickY = e.clientY ? (e.clientY - (arena?.top || 0)) : balloon.y;

    // Add burst particles
    const burstColors = ['#f43f5e', '#38bdf8', '#34d399', '#fbbf24', '#c084fc'];
    const newParticles = Array.from({ length: 10 }, (_, i) => ({
      id: Math.random(),
      x: clickX,
      y: clickY,
      dx: (Math.random() - 0.5) * 60,
      dy: (Math.random() - 0.5) * 60,
      color: burstColors[i % burstColors.length],
      created: Date.now()
    }));
    setParticles(prev => [...prev, ...newParticles]);

    // Add float text
    setFloatingScores(prev => [
      ...prev,
      { id: Math.random(), x: clickX, y: clickY - 10, text: '+1 Zen 🫧', created: Date.now() }
    ]);

    // Remove popped balloon
    setBalloons(prev => prev.filter(b => b.id !== balloon.id));
  };

  const handleResetGame = () => {
    setBalloons([]);
    setPoppedTotal(0);
    setParticles([]);
    setFloatingScores([]);
    lastSpawnTime.current = Date.now();
  };

  // ------------------ 2. BUBBLE WRAP SHEET STATE ------------------
  const [wrapBubbles, setWrapBubbles] = useState(() => 
    Array.from({ length: INITIAL_WRAP_COUNT }, (_, i) => ({
      id: i,
      popped: false,
      color: BALLOON_PALETTES[i % BALLOON_PALETTES.length]
    }))
  );
  const wrapPoppedCount = wrapBubbles.filter(b => b.popped).length;
  const wrapProgress = Math.min(100, Math.round((wrapPoppedCount / INITIAL_WRAP_COUNT) * 100));

  const handlePopWrapBubble = (id) => {
    setWrapBubbles(prev => prev.map(b => {
      if (b.id === id && !b.popped) {
        playBalloonPopSound(soundEnabled);
        return { ...b, popped: true };
      }
      return b;
    }));
  };

  const handleResetWrap = () => {
    setWrapBubbles(Array.from({ length: INITIAL_WRAP_COUNT }, (_, i) => ({
      id: i,
      popped: false,
      color: BALLOON_PALETTES[(i + Math.floor(Math.random() * 6)) % BALLOON_PALETTES.length]
    })));
  };

  // ------------------ 3. ZEN DOODLE CANVAS STATE ------------------
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#0284c7');
  const [brushSize, setBrushSize] = useState(6);
  const [brushType, setBrushType] = useState('smooth');

  const ZEN_COLORS = [
    { label: 'Deep Sky', value: '#0284c7' },
    { label: 'Lavender', value: '#8b5cf6' },
    { label: 'Mint Zen', value: '#10b981' },
    { label: 'Warm Amber', value: '#f59e0b' },
    { label: 'Soft Rose', value: '#ec4899' },
    { label: 'Indigo Night', value: '#4f46e5' },
    { label: 'Forest Green', value: '#059669' },
    { label: 'Charcoal', value: '#1e293b' }
  ];

  useEffect(() => {
    if (activeMode === 'doodle' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = 420 * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, 420);
    }
  }, [activeMode]);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top;

    ctx.lineWidth = brushSize;

    if (brushType === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.shadowBlur = 0;
    } else if (brushType === 'glow') {
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 12;
      ctx.shadowColor = brushColor;
    } else {
      ctx.strokeStyle = brushColor;
      ctx.shadowBlur = 0;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.closePath();
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, 420);
  };

  const downloadArt = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageURI = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `Zen-Artwork-${Date.now()}.png`;
    link.href = imageURI;
    link.click();
  };

  return (
    <div className="zen-container">
      {/* Header & Subtitle */}
      <div className="zen-header-card">
        <div className="zen-header-left">
          <div className="zen-badge-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="zen-title">Stress Relief & Decompression Studio</h2>
            <p className="zen-subtitle">
              Pop falling balloons, release bubble wrap sheets, or express yourself on the Zen canvas to soothe digital anxiety.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="zen-mode-selector">
          <button 
            type="button"
            className={`zen-mode-btn ${activeMode === 'falling' ? 'active' : ''}`}
            onClick={() => setActiveMode('falling')}
          >
            <span style={{ fontSize: '1.15rem' }}>🎈</span> Falling Balloons Pop
          </button>
          <button 
            type="button"
            className={`zen-mode-btn ${activeMode === 'wrap' ? 'active' : ''}`}
            onClick={() => setActiveMode('wrap')}
          >
            <span style={{ fontSize: '1.15rem' }}>🫧</span> Bubble Wrap
          </button>
          <button 
            type="button"
            className={`zen-mode-btn ${activeMode === 'doodle' ? 'active' : ''}`}
            onClick={() => setActiveMode('doodle')}
          >
            <Paintbrush size={16} /> Zen Art Canvas
          </button>
        </div>
      </div>

      {/* ----------------- MODE 1: FALLING BALLOONS POP GAME ----------------- */}
      {activeMode === 'falling' && (
        <div className="falling-game-wrapper">
          {/* Game Stats & Controls Bar */}
          <div className="falling-stats-bar">
            <div className="falling-stat-box">
              <span className="falling-stat-label">Balloons Popped</span>
              <span className="falling-stat-val">🎈 {poppedTotal}</span>
            </div>

            <div className="falling-stat-box">
              <span className="falling-stat-label">Estimated Stress</span>
              <div className="falling-stress-meter">
                <div 
                  className="falling-stress-fill"
                  style={{ 
                    width: `${stressLevel}%`,
                    background: stressLevel > 60 ? '#f43f5e' : stressLevel > 30 ? '#f59e0b' : '#10b981'
                  }}
                />
              </div>
              <span className="falling-stat-val" style={{ color: stressLevel > 60 ? '#f43f5e' : stressLevel > 30 ? '#f59e0b' : '#10b981' }}>
                {stressLevel}% {stressLevel <= 30 ? '• Zen Mind 🌿' : '• Relieving...'}
              </span>
            </div>

            {/* Speed & Control Actions */}
            <div className="falling-controls-group">
              <div className="falling-speed-pill">
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>SPEED:</span>
                <button 
                  type="button"
                  className={`speed-chip ${speedMultiplier === 0.8 ? 'active' : ''}`}
                  onClick={() => setSpeedMultiplier(0.8)}
                >
                  Gentle
                </button>
                <button 
                  type="button"
                  className={`speed-chip ${speedMultiplier === 1 ? 'active' : ''}`}
                  onClick={() => setSpeedMultiplier(1)}
                >
                  Calm
                </button>
                <button 
                  type="button"
                  className={`speed-chip ${speedMultiplier === 1.4 ? 'active' : ''}`}
                  onClick={() => setSpeedMultiplier(1.4)}
                >
                  Breeze
                </button>
              </div>

              <button 
                type="button"
                className={`zen-icon-btn ${isPlaying ? 'active' : ''}`}
                onClick={() => setIsPlaying(p => !p)}
                title={isPlaying ? 'Pause Game' : 'Resume Game'}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button 
                type="button"
                className={`zen-icon-btn ${soundEnabled ? 'active' : ''}`}
                onClick={() => {
                  setSoundEnabled(s => {
                    const next = !s;
                    if (next) playBalloonPopSound(true);
                    return next;
                  });
                }}
                title={soundEnabled ? 'Mute Audio' : 'Enable Pop Audio'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>

              <button 
                type="button"
                className="zen-icon-btn"
                onClick={handleResetGame}
                title="Restart Falling Balloons"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>

          {/* Falling Balloon Arena */}
          <div className="falling-arena" ref={arenaRef}>
            <div className="arena-cloud cloud-1">☁️</div>
            <div className="arena-cloud cloud-2">☁️</div>
            <div className="arena-cloud cloud-3">☁️</div>

            {/* Hint overlay at beginning */}
            {poppedTotal === 0 && balloons.length > 0 && (
              <div className="falling-hint-overlay">
                <span>👆 Click or tap balloons as they fall to pop them!</span>
              </div>
            )}

            {/* Balloons Falling from Top */}
            {balloons.map((b) => (
              <div
                key={b.id}
                className="falling-balloon-item"
                style={{
                  left: `${b.x}%`,
                  top: `${b.y}px`,
                  width: `${b.size}px`,
                  height: `${b.size * 1.25}px`,
                  transform: `translateX(${Math.sin(b.sway + b.y * 0.02) * 16}px)`
                }}
                onMouseDown={(e) => handlePopBalloon(e, b)}
                onTouchStart={(e) => handlePopBalloon(e, b)}
                title="Pop me!"
              >
                <div 
                  className="balloon-globe"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, #ffffff 0%, ${b.color.bg} 52%, ${b.color.border} 100%)`,
                    borderColor: b.color.border,
                    boxShadow: `0 8px 22px ${b.color.glow}, inset 0 2px 5px rgba(255, 255, 255, 0.8)`
                  }}
                >
                  <div className="balloon-shine-spec" />
                  <div className="balloon-bottom-knot" style={{ background: b.color.border }} />
                  <div className="balloon-trail-string" />
                </div>
              </div>
            ))}

            {/* Confetti Particles */}
            {particles.map(p => (
              <div 
                key={p.id}
                className="falling-pop-particle"
                style={{
                  left: `${p.x}px`,
                  top: `${p.y}px`,
                  background: p.color,
                  transform: `translate(${p.dx}px, ${p.dy}px) scale(0)`
                }}
              />
            ))}

            {/* Floating "+1 Zen" Scores */}
            {floatingScores.map(s => (
              <div
                key={s.id}
                className="falling-float-text"
                style={{ left: `${s.x}px`, top: `${s.y}px` }}
              >
                {s.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- MODE 2: BUBBLE WRAP SHEET ----------------- */}
      {activeMode === 'wrap' && (
        <div className="zen-bubble-workspace">
          <div className="zen-metrics-bar">
            <div className="zen-metric-item">
              <span className="zen-metric-label">Stress Released</span>
              <div className="zen-progress-wrap">
                <div className="zen-progress-bar" style={{ width: `${wrapProgress}%` }}></div>
              </div>
              <span className="zen-metric-val">{wrapProgress}% Complete</span>
            </div>

            <div className="zen-message-pill">
              {wrapProgress === 100 ? 'Sheet completely cleared! Your mind is peaceful 🧘' : 'Tap any bubble to feel the tactile pop! 🫧'}
            </div>

            <div className="zen-actions-row">
              <button 
                type="button"
                className={`zen-icon-btn ${soundEnabled ? 'active' : ''}`}
                onClick={() => setSoundEnabled(v => !v)}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                <span>{soundEnabled ? 'Sound On' : 'Muted'}</span>
              </button>

              <button 
                type="button"
                className="zen-icon-btn"
                onClick={handleResetWrap}
              >
                <RotateCcw size={16} />
                <span>New Sheet</span>
              </button>
            </div>
          </div>

          <div className="zen-bubble-grid-card">
            <div className="bubble-sheet-frame">
              {wrapBubbles.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`bubble-cell ${b.popped ? 'popped' : ''}`}
                  style={{
                    '--bubble-bg': b.color.bg,
                    '--bubble-border': b.color.border,
                    '--bubble-glow': b.color.glow
                  }}
                  onClick={() => handlePopWrapBubble(b.id)}
                  title={b.popped ? 'Popped!' : 'Click to pop 🫧'}
                >
                  <div className="bubble-highlight"></div>
                  {b.popped && <span className="bubble-pop-mark">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODE 3: ZEN DOODLE CANVAS ----------------- */}
      {activeMode === 'doodle' && (
        <div className="zen-doodle-workspace">
          <div className="zen-canvas-toolbar">
            <div className="zen-tool-group">
              <span className="zen-tool-label">Brush:</span>
              <button 
                type="button" 
                className={`zen-tool-btn ${brushType === 'smooth' ? 'active' : ''}`}
                onClick={() => setBrushType('smooth')}
              >
                Smooth Pen
              </button>
              <button 
                type="button" 
                className={`zen-tool-btn ${brushType === 'glow' ? 'active' : ''}`}
                onClick={() => setBrushType('glow')}
              >
                ✨ Neon Glow
              </button>
              <button 
                type="button" 
                className={`zen-tool-btn ${brushType === 'eraser' ? 'active' : ''}`}
                onClick={() => setBrushType('eraser')}
              >
                Eraser
              </button>
            </div>

            <div className="zen-tool-group">
              <span className="zen-tool-label">Size: {brushSize}px</span>
              <input 
                type="range"
                min="2"
                max="28"
                step="2"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="styled-range zen-size-slider"
              />
            </div>

            {brushType !== 'eraser' && (
              <div className="zen-tool-group zen-palette-group">
                <span className="zen-tool-label">Palette:</span>
                <div className="zen-swatches-wrap">
                  {ZEN_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`zen-swatch ${brushColor === c.value ? 'active' : ''}`}
                      style={{ background: c.value }}
                      onClick={() => setBrushColor(c.value)}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="zen-tool-group zen-canvas-actions">
              <button 
                type="button" 
                className="zen-action-btn secondary"
                onClick={clearCanvas}
                title="Clear the canvas"
              >
                <Trash2 size={16} /> Clear
              </button>
              <button 
                type="button" 
                className="zen-action-btn primary"
                onClick={downloadArt}
                title="Save artwork to your computer"
              >
                <Download size={16} /> Save Art
              </button>
            </div>
          </div>

          <div className="zen-canvas-container">
            <canvas 
              ref={canvasRef}
              className="zen-html5-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <div className="zen-canvas-hint">
              Draw mandalas, soothing shapes, or freeform feelings. Expressing without rules releases cognitive friction.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

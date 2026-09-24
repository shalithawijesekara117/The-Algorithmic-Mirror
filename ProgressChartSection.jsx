import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  TrendingUp, Activity, Brain, Moon, Sparkles, 
  Calendar, ArrowUpRight, ArrowDownRight, Info, Maximize2, X
} from 'lucide-react';
import { calculateAccurateMentalProfile } from './mentalCalculation';

export default function ProgressChartSection({
  history = [],
  currentAssessment = null,
  currentUser = null,
  activeHabits = null,
  isModal = false,
  onOpenModal = null,
  onClose = null
}) {
  const [activeMetric, setActiveMetric] = useState('wellness'); // 'wellness' | 'stress_anxiety' | 'habits'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Normalize data with resilient live baseline fallback so graph ALWAYS displays!
  const timelineData = useMemo(() => {
    const rawRecords = [];
    const seenIds = new Set();

    // 1. If a current assessment exists, include it
    if (currentAssessment) {
      const id = currentAssessment.id || currentAssessment._id || (currentAssessment.created_at ? new Date(currentAssessment.created_at).getTime() : 'latest');
      seenIds.add(String(id));
      rawRecords.push(currentAssessment);
    }

    // 2. Add historical records without duplicates
    if (Array.isArray(history)) {
      history.forEach((rec, i) => {
        const id = rec.id || rec._id || (rec.created_at ? new Date(rec.created_at).getTime() : `hist_${i}`);
        if (!seenIds.has(String(id))) {
          seenIds.add(String(id));
          rawRecords.push(rec);
        }
      });
    }

    // 3. Resilient fallback: If no saved evaluations yet, build from active habit inputs so graph is NEVER empty!
    if (rawRecords.length === 0) {
      const sTime = activeHabits?.screenTime ?? 7.5;
      const sSleep = activeHabits?.sleepHours ?? 6.0;
      const sSocial = activeHabits?.socialHours ?? 2.0;
      const sPlatforms = activeHabits?.platforms ?? ['Instagram', 'TikTok'];
      const sStress = activeHabits?.stress ?? 5.4;
      const sAnxiety = activeHabits?.anxiety ?? 4.8;
      
      const screenFactor = Math.min(1.0, sTime / 12.0) * 30;
      const sleepDeficit = Math.max(0.0, 8.0 - sSleep) / 8.0 * 25;
      const mentalFactor = (((sStress + sAnxiety + 4.0) / 3.0) / 10.0) * 45;
      const baseRisk = Math.min(100.0, Math.round((screenFactor + sleepDeficit + mentalFactor) * 10) / 10);
      const baseCat = baseRisk <= 25 ? 'Low Risk' : baseRisk <= 50 ? 'Moderate Risk' : baseRisk <= 75 ? 'High Risk' : 'Very High Risk';

      rawRecords.push({
        id: 'active_baseline',
        created_at: new Date().toISOString(),
        isLiveBaseline: true,
        habits: {
          screen_time: sTime,
          sleep_hours: sSleep,
          social_activity_hours: sSocial,
          social_media_platform: sPlatforms
        },
        mental_profile: {
          stress_level: sStress,
          anxiety_level: sAnxiety,
          depression_level: 4.0
        },
        recommendation: {
          risk_score: baseRisk,
          risk_category: baseCat,
          summary: `Current routine baseline: ${sTime}h daily screen time with ${sSleep}h sleep.`,
          recommendation_advice: []
        }
      });
    }

    // Sort strictly chronologically (oldest to newest)
    rawRecords.sort((a, b) => {
      const getMs = (r) => {
        let str = String(r.created_at || '');
        if (str && !str.endsWith('Z') && !str.includes('+') && !str.slice(10).includes('-')) str += 'Z';
        const t = new Date(str).getTime();
        return isNaN(t) ? 0 : t;
      };
      return getMs(a) - getMs(b);
    });

    // Convert into standardized graph points using Sri Lankan Time (Asia/Colombo)
    return rawRecords.map((rec, idx) => {
      let rawDate = rec.created_at;
      let d;
      if (rawDate) {
        let str = String(rawDate).trim();
        if (!str.endsWith('Z') && !str.includes('+') && !str.slice(10).includes('-')) {
          str += 'Z';
        }
        d = new Date(str);
      } else {
        d = new Date();
      }
      if (isNaN(d.getTime())) {
        d = new Date();
      }

      // Format explicitly in Sri Lankan Standard Time (Asia/Colombo, UTC+05:30)
      const timeZone = 'Asia/Colombo';
      const timeStr = d.toLocaleTimeString('en-US', { 
        timeZone, 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      const dateStr = d.toLocaleDateString('en-US', { 
        timeZone, 
        month: 'short', 
        day: 'numeric' 
      });
      const fullDate = d.toLocaleDateString('en-US', { 
        timeZone, 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      const rawRisk = rec.recommendation?.risk_score;
      const risk = typeof rawRisk === 'number' && !isNaN(rawRisk) 
        ? rawRisk 
        : (parseFloat(rawRisk) || 50);
      const wellness = Math.max(0, Math.min(100, Math.round(100 - risk)));

      const screenTime = rec.habits?.screen_time ?? 0;
      const sleepHours = rec.habits?.sleep_hours ?? 7.0;
      const socialHours = rec.habits?.social_activity_hours ?? 2.0;
      const platformHrs = rec.habits?.platform_hours || {};
      const platforms = Array.isArray(rec.habits?.social_media_platform) 
        ? rec.habits.social_media_platform 
        : (rec.habits?.social_media_platform ? [rec.habits.social_media_platform] : []);

      let stress = rec.mental_profile?.stress_level;
      let anxiety = rec.mental_profile?.anxiety_level;

      if (stress === undefined || stress === null || (stress === 6 && anxiety === 5)) {
        const calculated = calculateAccurateMentalProfile(screenTime, sleepHours, platformHrs, socialHours, platforms);
        stress = calculated.stress;
        anxiety = calculated.anxiety;
      } else {
        stress = Math.round(parseFloat(stress) * 10) / 10;
        anxiety = Math.round(parseFloat(anxiety) * 10) / 10;
      }

      return {
        id: rec.id || rec._id || `rec_${idx}`,
        isLiveBaseline: Boolean(rec.isLiveBaseline),
        timeStr,
        dateStr,
        label: `${timeStr}\n${dateStr}`,
        fullDate,
        wellness,
        risk: Math.round(risk),
        stress,
        anxiety,
        depression: rec.mental_profile?.depression_level ?? 4,
        screenTime,
        sleepHours,
        socialHours,
        platforms,
        category: rec.recommendation?.risk_category || (risk > 75 ? 'Very High Risk' : risk > 50 ? 'High Risk' : risk > 25 ? 'Moderate Risk' : 'Low Risk'),
        advice: rec.recommendation?.recommendation_advice || []
      };
    });
  }, [history, currentAssessment, activeHabits]);

  const totalLogs = timelineData.length;
  const latestPoint = totalLogs > 0 ? timelineData[totalLogs - 1] : null;
  const firstPoint = totalLogs > 0 ? timelineData[0] : null;
  const wellnessDelta = totalLogs > 1 ? (latestPoint.wellness - firstPoint.wellness) : 0;

  const avgStress = totalLogs > 0 
    ? Math.round((timelineData.reduce((s, p) => s + p.stress, 0) / totalLogs) * 10) / 10 
    : 0;
  const avgScreen = totalLogs > 0 
    ? Math.round((timelineData.reduce((s, p) => s + p.screenTime, 0) / totalLogs) * 10) / 10 
    : 0;
  const avgSleep = totalLogs > 0 
    ? Math.round((timelineData.reduce((s, p) => s + p.sleepHours, 0) / totalLogs) * 10) / 10 
    : 0;

  const chartScrollRef = useRef(null);

  useEffect(() => {
    if (chartScrollRef.current && totalLogs > 10) {
      chartScrollRef.current.scrollLeft = chartScrollRef.current.scrollWidth;
    }
  }, [totalLogs]);

  // SVG Geometry
  const svgWidth = Math.max(720, totalLogs * 65);
  const svgHeight = 265;
  const padLeft = 48;
  const padRight = 36;
  const padTop = 26;
  const padBottom = 48;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const getPoints = () => {
    if (totalLogs === 0) return [];

    return timelineData.map((d, i) => {
      const x = totalLogs === 1 
        ? padLeft + chartW / 2 
        : padLeft + (i / Math.max(1, totalLogs - 1)) * chartW;

      let yValPrimary = 0;
      let yValSecondary = null;

      if (activeMetric === 'wellness') {
        yValPrimary = padTop + chartH - (d.wellness / 100) * chartH;
      } else if (activeMetric === 'stress_anxiety') {
        yValPrimary = padTop + chartH - (d.stress / 10) * chartH;
        yValSecondary = padTop + chartH - (d.anxiety / 10) * chartH;
      } else {
        yValPrimary = padTop + chartH - (Math.min(12, d.screenTime) / 12) * chartH;
        yValSecondary = padTop + chartH - (Math.min(12, d.sleepHours) / 12) * chartH;
      }

      return { x, y: yValPrimary, y2: yValSecondary, data: d };
    });
  };

  const points = getPoints();

  // Smooth spline curve
  const buildSmoothPath = (pts, key = 'y') => {
    if (pts.length <= 1) return '';

    let path = `M ${pts[0].x} ${pts[0][key]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1[key] + (p2[key] - p0[key]) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2[key] - (p3[key] - p1[key]) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2[key]}`;
    }
    return path;
  };

  const linePath = totalLogs > 1 ? buildSmoothPath(points, 'y') : '';
  const linePathSecondary = totalLogs > 1 && activeMetric !== 'wellness' ? buildSmoothPath(points, 'y2') : '';

  const areaPath = totalLogs > 1 && points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`
    : '';

  const yLabels = activeMetric === 'wellness' 
    ? ['100%', '75%', '50%', '25%', '0%']
    : activeMetric === 'stress_anxiety'
    ? ['10', '7.5', '5.0', '2.5', '0']
    : ['12h', '9h', '6h', '3h', '0h'];

  return (
    <div className={isModal ? "" : "progress-chart-embedded"}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: isModal ? '1.3rem' : '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Mental Health Progress Analytics
              </h3>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px', background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}>
                {latestPoint?.isLiveBaseline ? 'Live Routine Baseline' : totalLogs === 1 ? '1 Evaluation Logged' : `${totalLogs} Evaluations Logged`}
              </span>
            </div>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Interactive visual trajectory generated from your digital habits & assessments
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {!isModal && onOpenModal && (
            <button 
              type="button" 
              onClick={onOpenModal}
              className="progress-graph-btn"
              title="Expand Graph to Fullscreen Modal"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
            >
              <Maximize2 size={14} /> Full View
            </button>
          )}
          {isModal && onClose && (
            <button 
              type="button"
              onClick={onClose} 
              style={{ background: '#f1f5f9', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close Analytics"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-glass-light)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Wellness Score
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: (latestPoint?.wellness ?? 50) >= 65 ? 'var(--risk-low)' : (latestPoint?.wellness ?? 50) >= 45 ? 'var(--risk-med)' : 'var(--risk-high)' }}>
              {latestPoint?.wellness ?? 50}%
            </span>
            {totalLogs > 1 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: wellnessDelta >= 0 ? 'var(--risk-low)' : 'var(--risk-high)', display: 'inline-flex', alignItems: 'center' }}>
                {wellnessDelta >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                {Math.abs(wellnessDelta)}%
              </span>
            )}
            {latestPoint?.isLiveBaseline && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                (Live)
              </span>
            )}
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid var(--border-glass-light)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Stress Level
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: avgStress <= 4 ? 'var(--risk-low)' : avgStress <= 7 ? 'var(--risk-med)' : 'var(--risk-high)' }}>
              {typeof avgStress === 'number' ? avgStress.toFixed(1) : avgStress}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ 10</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid var(--border-glass-light)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Screen Time
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {typeof avgScreen === 'number' ? avgScreen.toFixed(1) : avgScreen}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>hrs</span>
          </div>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid var(--border-glass-light)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
            Evaluations
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--border-focus)' }}>
              {totalLogs}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {latestPoint?.isLiveBaseline ? 'baseline' : totalLogs === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>
      </div>

      {/* Metric Selector Tabs & Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: '10px' }}>
          <button
            type="button"
            className={`metric-tab-btn ${activeMetric === 'wellness' ? 'active' : ''}`}
            onClick={() => { setActiveMetric('wellness'); setHoveredPoint(null); }}
          >
            <Brain size={15} /> Mental Wellness Score
          </button>
          <button
            type="button"
            className={`metric-tab-btn ${activeMetric === 'stress_anxiety' ? 'active' : ''}`}
            onClick={() => { setActiveMetric('stress_anxiety'); setHoveredPoint(null); }}
          >
            <Activity size={15} /> Stress & Anxiety (1-10)
          </button>
          <button
            type="button"
            className={`metric-tab-btn ${activeMetric === 'habits' ? 'active' : ''}`}
            onClick={() => { setActiveMetric('habits'); setHoveredPoint(null); }}
          >
            <Moon size={15} /> Screen Time vs Sleep
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {activeMetric === 'wellness' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} />
              Wellness Index (%)
            </span>
          )}
          {activeMetric === 'stress_anxiety' && (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6' }} />
                Stress Level
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
                Anxiety Level
              </span>
            </>
          )}
          {activeMetric === 'habits' && (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0284c7' }} />
                Screen Time (hrs)
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
                Sleep Duration (hrs)
              </span>
            </>
          )}
        </div>
      </div>

      {/* SVG Graph Container */}
      <div style={{ background: '#ffffff', border: '1.5px solid var(--border-glass-light)', borderRadius: '16px', padding: '1.25rem 0.5rem 0.85rem 0.5rem', position: 'relative', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.03)' }}>
        {totalLogs > 10 && (
          <div style={{ position: 'absolute', top: '10px', left: '16px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 5, background: 'rgba(255, 255, 255, 0.88)', padding: '2px 8px', borderRadius: '6px', backdropFilter: 'blur(4px)' }}>
            <span>↔ Scroll horizontally to view all evaluations</span>
          </div>
        )}

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '18px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '0.55rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.78rem',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
            pointerEvents: 'none',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <div style={{ fontWeight: 800, color: '#38bdf8' }}>{hoveredPoint.data.fullDate}</div>
            <div>Wellness Index: <strong>{hoveredPoint.data.wellness}%</strong></div>
            <div>Stress: {typeof hoveredPoint.data.stress === 'number' ? hoveredPoint.data.stress.toFixed(1) : hoveredPoint.data.stress}/10 • Anxiety: {typeof hoveredPoint.data.anxiety === 'number' ? hoveredPoint.data.anxiety.toFixed(1) : hoveredPoint.data.anxiety}/10</div>
            <div>Screen: {hoveredPoint.data.screenTime}h • Sleep: {hoveredPoint.data.sleepHours}h</div>
          </div>
        )}

        <div 
          ref={chartScrollRef} 
          style={{ 
            overflowX: totalLogs > 10 ? 'auto' : 'hidden', 
            width: '100%', 
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '4px'
          }}
        >
          <svg 
            viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
            style={{ 
              width: totalLogs > 10 ? `${svgWidth}px` : '100%', 
              minWidth: totalLogs > 10 ? `${svgWidth}px` : '100%', 
              height: 'auto', 
              display: 'block', 
              overflow: 'visible' 
            }}
          >
            <defs>
              <linearGradient id="wellnessGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="habitsGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Axis */}
            {yLabels.map((lbl, idx) => {
              const y = padTop + (idx / 4) * chartH;
              return (
                <g key={idx}>
                  <text 
                    x={padLeft - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    fill="#94a3b8" 
                    fontSize="11" 
                    fontFamily="var(--font-body)"
                    fontWeight="600"
                  >
                    {lbl}
                  </text>
                  <line 
                    x1={padLeft} 
                    y1={y} 
                    x2={svgWidth - padRight} 
                    y2={y} 
                    stroke="#f1f5f9" 
                    strokeWidth="1.2"
                    strokeDasharray={idx === 4 ? '' : '4 4'}
                  />
                </g>
              );
            })}

            {/* Single Point Guidelines */}
            {totalLogs === 1 && points[0] && (
              <g>
                <line 
                  x1={padLeft} 
                  y1={points[0].y} 
                  x2={svgWidth - padRight} 
                  y2={points[0].y} 
                  stroke="#0284c7" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4"
                  opacity="0.4"
                />
                {points[0].y2 !== null && (
                  <line 
                    x1={padLeft} 
                    y1={points[0].y2} 
                    x2={svgWidth - padRight} 
                    y2={points[0].y2} 
                    stroke={activeMetric === 'stress_anxiety' ? '#06b6d4' : '#10b981'} 
                    strokeWidth="1.5" 
                    strokeDasharray="4 4"
                    opacity="0.4"
                  />
                )}
                <line 
                  x1={points[0].x} 
                  y1={padTop} 
                  x2={points[0].x} 
                  y2={padTop + chartH} 
                  stroke="#cbd5e1" 
                  strokeWidth="1" 
                  strokeDasharray="3 3"
                />
              </g>
            )}

            {/* Gradient Area Fill (2+ points) */}
            {areaPath && (
              <path 
                d={areaPath} 
                fill={activeMetric === 'wellness' ? 'url(#wellnessGrad)' : activeMetric === 'stress_anxiety' ? 'url(#stressGrad)' : 'url(#habitsGrad)'} 
              />
            )}

            {/* Secondary Line (2+ points) */}
            {linePathSecondary && (
              <path 
                d={linePathSecondary} 
                fill="none" 
                stroke={activeMetric === 'stress_anxiety' ? '#06b6d4' : '#10b981'} 
                strokeWidth="2.5" 
                strokeDasharray="5 5"
              />
            )}

            {/* Primary Main Line (2+ points) */}
            {linePath && (
              <path 
                d={linePath} 
                fill="none" 
                stroke={activeMetric === 'wellness' ? '#0284c7' : activeMetric === 'stress_anxiety' ? '#8b5cf6' : '#0284c7'} 
                strokeWidth="3" 
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Data Points */}
            {points.map((pt, i) => {
              const isHovered = hoveredPoint?.data?.id === pt.data.id;
              const primaryColor = activeMetric === 'wellness' ? '#0284c7' : activeMetric === 'stress_anxiety' ? '#8b5cf6' : '#0284c7';
              
              return (
                <g 
                  key={i} 
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle cx={pt.x} cy={pt.y} r={20} fill="transparent" />

                  {/* Secondary point */}
                  {pt.y2 !== null && (
                    <g>
                      <circle 
                        cx={pt.x} 
                        cy={pt.y2} 
                        r={isHovered || totalLogs === 1 ? 7 : 4.5} 
                        fill="#ffffff" 
                        stroke={activeMetric === 'stress_anxiety' ? '#06b6d4' : '#10b981'} 
                        strokeWidth="3"
                      />
                      {totalLogs === 1 && (
                        <text 
                          x={pt.x + 12} 
                          y={pt.y2 + 4} 
                          fill={activeMetric === 'stress_anxiety' ? '#06b6d4' : '#10b981'} 
                          fontSize="12" 
                          fontWeight="800"
                          fontFamily="var(--font-body)"
                        >
                          {activeMetric === 'stress_anxiety' ? `Anxiety: ${typeof pt.data.anxiety === 'number' ? pt.data.anxiety.toFixed(1) : pt.data.anxiety}/10` : `Sleep: ${pt.data.sleepHours}h`}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Primary point */}
                  <circle 
                    cx={pt.x} 
                    cy={pt.y} 
                    r={isHovered || totalLogs === 1 ? 8 : 5} 
                    fill="#ffffff" 
                    stroke={primaryColor} 
                    strokeWidth="3.5"
                    style={{ transition: 'r 0.15s ease' }}
                  />

                  {totalLogs === 1 && (
                    <text 
                      x={pt.x + 12} 
                      y={pt.y + 4} 
                      fill={primaryColor} 
                      fontSize="12" 
                      fontWeight="800"
                      fontFamily="var(--font-body)"
                    >
                      {activeMetric === 'wellness' 
                        ? `Wellness: ${pt.data.wellness}%` 
                        : activeMetric === 'stress_anxiety' 
                        ? `Stress: ${typeof pt.data.stress === 'number' ? pt.data.stress.toFixed(1) : pt.data.stress}/10` 
                        : `Screen: ${pt.data.screenTime}h`}
                    </text>
                  )}

                  {/* X-axis Date/Time Label */}
                  <g>
                    <text 
                      x={pt.x} 
                      y={padTop + chartH + 18} 
                      textAnchor="middle" 
                      fill={isHovered ? 'var(--border-focus)' : '#1e293b'} 
                      fontSize={totalLogs > 12 ? '10' : '10.5'} 
                      fontWeight={isHovered || totalLogs === 1 ? '800' : '700'}
                      fontFamily="var(--font-body)"
                    >
                      {pt.data.timeStr}
                    </text>
                    <text 
                      x={pt.x} 
                      y={padTop + chartH + 32} 
                      textAnchor="middle" 
                      fill={isHovered ? '#0f172a' : '#64748b'} 
                      fontSize={totalLogs > 12 ? '9' : '9.5'} 
                      fontWeight={isHovered || totalLogs === 1 ? '700' : '500'}
                      fontFamily="var(--font-body)"
                    >
                      {pt.data.dateStr}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* AI Behavioral Pattern Insight */}
      <div style={{ marginTop: '1rem', background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.06), rgba(56, 189, 248, 0.12))', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '12px', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Sparkles size={18} color="#0284c7" style={{ minWidth: '18px' }} />
        <div style={{ fontSize: '0.86rem', color: 'var(--text-primary)', lineHeight: '1.45' }}>
          <strong>AI Trajectory Insight: </strong> 
          {latestPoint?.isLiveBaseline 
            ? `Displaying your active routine baseline (${latestPoint.screenTime}h screen, ${latestPoint.sleepHours}h sleep). Click 'Run Risk & Wellness Prediction' to log your first recorded assessment!`
            : wellnessDelta > 0 
            ? `Your mental wellness index has improved by +${wellnessDelta}% across your recorded evaluations. Keep up the balanced routine!`
            : `Evaluations show an average screen time of ${avgScreen}h with ${avgSleep}h sleep. Prioritizing consistent rest helps maintain a stable wellness score.`}
        </div>
      </div>

      {/* Recorded History Table */}
      {totalLogs > 0 && (
        <div style={{ marginTop: '1.4rem' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Evaluation History ({totalLogs})
          </div>

          <div style={{ border: '1px solid var(--border-glass-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1.2fr 1fr 1fr', background: '#f8fafc', padding: '0.65rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass-light)' }}>
              <span>DATE & TIME</span>
              <span>SCREEN / SLEEP</span>
              <span>STRESS (1-10)</span>
              <span>ANXIETY</span>
              <span style={{ textAlign: 'right' }}>WELLNESS</span>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              {[...timelineData].reverse().map((entry, idx) => (
                <div 
                  key={entry.id || idx} 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1.8fr 1.2fr 1.2fr 1fr 1fr', 
                    padding: '0.7rem 1rem', 
                    fontSize: '0.84rem', 
                    alignItems: 'center',
                    borderBottom: idx === timelineData.length - 1 ? 'none' : '1px solid #f1f5f9',
                    background: idx % 2 === 0 ? '#ffffff' : '#fafbfc'
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {entry.fullDate} {entry.isLiveBaseline ? ' (Baseline)' : ''}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {entry.screenTime}h / {entry.sleepHours}h
                  </span>
                  <span style={{ fontWeight: 600, color: entry.stress >= 7 ? 'var(--risk-high)' : entry.stress >= 5 ? 'var(--risk-med)' : 'var(--risk-low)' }}>
                    {typeof entry.stress === 'number' ? entry.stress.toFixed(1) : entry.stress}/10
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {typeof entry.anxiety === 'number' ? entry.anxiety.toFixed(1) : entry.anxiety}/10
                  </span>
                  <span style={{ textAlign: 'right', fontWeight: 800, color: entry.wellness >= 65 ? 'var(--risk-low)' : entry.wellness >= 45 ? 'var(--risk-med)' : 'var(--risk-high)' }}>
                    {entry.wellness}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

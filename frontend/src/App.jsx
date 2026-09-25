import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Activity, Brain, LogOut, Lock, Mail, User, 
  Smartphone, Moon, HeartPulse, Zap, CheckCircle2, MessageSquare, 
  Calendar, UserCheck, Star, Send, X, Check, Minus, MessageCircle, TrendingUp,
  Maximize2, Minimize2
} from 'lucide-react';
import { SiTiktok, SiInstagram, SiYoutube, SiFacebook, SiWhatsapp } from 'react-icons/si';
import { FaXTwitter } from 'react-icons/fa6';
import ZenRelief from './ZenRelief';
import MentalProgressModal from './MentalProgressModal';
import { calculateAccurateMentalProfile } from './mentalCalculation';

const DEFAULT_CHAT_MESSAGE = { sender: 'ai', message: 'Hello! I am your AI MindCare Companion. How are you feeling about your digital habits and mental balance today?' };

const SOCIAL_PLATFORMS = [
  { id: 'TikTok', name: 'TikTok', icon: <SiTiktok />, bg: '#000000', fg: '#ffffff' },
  { id: 'Instagram', name: 'Instagram', icon: <SiInstagram />, bg: '#E1306C', fg: '#ffffff' },
  { id: 'YouTube', name: 'YouTube', icon: <SiYoutube />, bg: '#FF0000', fg: '#ffffff' },
  { id: 'Facebook', name: 'Facebook', icon: <SiFacebook />, bg: '#1877F2', fg: '#ffffff' },
  { id: 'WhatsApp', name: 'WhatsApp', icon: <SiWhatsapp />, bg: '#25D366', fg: '#ffffff' },
  { id: 'X/Twitter', name: 'X / Twitter', icon: <FaXTwitter />, bg: '#000000', fg: '#ffffff' },
];

function FormattedChatMessage({ message, sender }) {
  if (sender === 'user') {
    return <div className="chat-user-text">{message}</div>;
  }

  // Parse AI message into paragraphs and formatted distinct point cards
  const lines = (message || '').split('\n');
  const blocks = [];
  let currentList = null;

  const renderInline = (str) => {
    if (!str) return null;
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={i} className="chat-strong-text">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      if (currentList && currentList.length > 0) {
        blocks.push({ type: 'list', items: currentList });
        currentList = null;
      }
      continue;
    }

    // Match bullet point (*, -, •) or numbered list (1., 2.)
    const match = trimmed.match(/^([*\-•]|\d+[\.\)])\s+(.*)$/);
    if (match) {
      if (!currentList) currentList = [];
      currentList.push({ marker: match[1], text: match[2] });
    } else {
      if (currentList && currentList.length > 0) {
        blocks.push({ type: 'list', items: currentList });
        currentList = null;
      }
      blocks.push({ type: 'paragraph', text: trimmed });
    }
  }

  if (currentList && currentList.length > 0) {
    blocks.push({ type: 'list', items: currentList });
  }

  return (
    <div className="chat-formatted-body">
      {blocks.map((b, idx) => {
        if (b.type === 'list') {
          return (
            <ul key={idx} className="chat-points-list">
              {b.items.map((it, itemIdx) => (
                <li key={itemIdx} className="chat-point-item">
                  <span className="chat-point-marker">
                    {/^\d+[\.\)]/.test(it.marker) ? it.marker : '•'}
                  </span>
                  <div className="chat-point-content">
                    {renderInline(it.text)}
                  </div>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={idx} className="chat-msg-paragraph">
            {renderInline(b.text)}
          </p>
        );
      })}
    </div>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authTab, setAuthTab] = useState('login');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);
  const chatInputRef = React.useRef(null);
  
  // Auth Form State
  const [authData, setAuthData] = useState({
    name: '',
    email: '',
    password: '',
    age: 21,
    gender: 'Male'
  });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', age: 21, gender: 'Non-binary' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Mental Health Progress Graph Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);

  // Multi-Select Social Media Platforms State
  const [selectedPlatforms, setSelectedPlatforms] = useState(['TikTok', 'Instagram']);
  const [platformHours, setPlatformHours] = useState({
    TikTok: 4.0,
    Instagram: 3.5,
    YouTube: 2.0,
    Facebook: 1.0,
    WhatsApp: 1.5,
    'X/Twitter': 1.0
  });

  // Psychological Indicators (Continuous 1-decimal auto-calculated)
  const [stressLevel, setStressLevel] = useState(5.4);
  const [anxietyLevel, setAnxietyLevel] = useState(4.8);
  const [depressionLevel, setDepressionLevel] = useState(4.0);

  // AI-Analyzed Mood Percentages (Gemini-driven)
  const [stressPct, setStressPct] = useState(null);
  const [anxietyPct, setAnxietyPct] = useState(null);
  const [moodAnalyzing, setMoodAnalyzing] = useState(false);

  // Automatic Calculation Outputs
  const [autoScreenTime, setAutoScreenTime] = useState(7.5);
  const [autoSleepHours, setAutoSleepHours] = useState(6.0);
  const [autoSocialActivityHours, setAutoSocialActivityHours] = useState(2.0);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  // Counseling State
  const [counselors, setCounselors] = useState([]);
  const [bookedSessions, setBookedSessions] = useState([]);
  const [bookingModal, setBookingModal] = useState({ open: false, counselor: null });
  const [bookingForm, setBookingForm] = useState({
    date: '2026-09-08',
    time: '14:00',
    topic: 'Screen Time & Doomscrolling Reduction',
    notes: ''
  });

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([DEFAULT_CHAT_MESSAGE]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Recalculate Screen Time automatically whenever selected platforms or hours change!
  useEffect(() => {
    let totalScreen = selectedPlatforms.reduce((sum, p) => sum + (platformHours[p] || 0), 0);
    totalScreen = Math.round(totalScreen * 10) / 10;
    setAutoScreenTime(totalScreen);
  }, [selectedPlatforms, platformHours]);

  // Recalculate Stress & Anxiety with 100% precision responding to any 0.5h slider shift
  useEffect(() => {
    const { stress, anxiety } = calculateAccurateMentalProfile(
      autoScreenTime,
      autoSleepHours,
      platformHours,
      autoSocialActivityHours,
      selectedPlatforms
    );
    setStressLevel(stress);
    setAnxietyLevel(anxiety);
  }, [autoScreenTime, autoSleepHours, platformHours, selectedPlatforms, autoSocialActivityHours]);

  // AI-analyze stress & anxiety into severity percentages via Gemini, debounced after slider settles
  useEffect(() => {
    setMoodAnalyzing(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/analyze-mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stress_level: parseFloat(stressLevel),
            anxiety_level: parseFloat(anxietyLevel)
          })
        });
        if (res.ok) {
          const data = await res.json();
          setStressPct(data.stress_percentage);
          setAnxietyPct(data.anxiety_percentage);
        }
      } catch (err) {
        // Silent fail — keep prior percentage, quick-stat falls back to raw value below.
      } finally {
        setMoodAnalyzing(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [stressLevel, anxietyLevel]);

  useEffect(() => {
    const saved = localStorage.getItem('algorithmic_user');
    if (saved) {
      try {
        const userObj = JSON.parse(saved);
        setCurrentUser(userObj);
        fetchHistory(userObj.email);
        fetchSessions(userObj.email);
        fetchChatHistory(userObj.email);
      } catch (e) {
        localStorage.removeItem('algorithmic_user');
      }
    }
    fetchCounselors();
  }, []);

  useEffect(() => {
    if (currentUser && !currentUser.onboarding_completed) {
      setOnboardAge(currentUser.age || '');
    }
  }, [currentUser]);

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  const handlePlatformHoursChange = (platformId, val) => {
    setPlatformHours(prev => ({
      ...prev,
      [platformId]: parseFloat(val)
    }));
  };

  const fetchCounselors = async () => {
    try {
      const res = await fetch('/api/counselors');
      if (res.ok) setCounselors(await res.json());
    } catch (e) {}
  };

  const fetchHistory = async (email) => {
    try {
      const res = await fetch(`/api/assessments?user_email=${encodeURIComponent(email)}&limit=30`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
        localStorage.setItem(`algorithmic_history_${email}`, JSON.stringify(data));
      }
    } catch (e) {
      const cached = localStorage.getItem(`algorithmic_history_${email}`);
      if (cached) {
        try { setHistory(JSON.parse(cached)); } catch (_) {}
      }
    }
  };

  const fetchSessions = async (email) => {
    try {
      const res = await fetch(`/api/counseling/sessions?user_email=${encodeURIComponent(email)}`);
      if (res.ok) setBookedSessions(await res.json());
    } catch (e) {}
  };

  const fetchChatHistory = async (email) => {
    // Reset first so a previous user's messages never linger on screen while this user's history loads.
    setChatMessages([DEFAULT_CHAT_MESSAGE]);
    try {
      const res = await fetch(`/api/counseling/chat/history?user_email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const saved = await res.json();
        setChatMessages(saved.length > 0 ? saved : [DEFAULT_CHAT_MESSAGE]);
      }
    } catch (e) {}
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    const endpoint = authTab === 'register' ? '/api/auth/register' : '/api/auth/login';
    const payload = authTab === 'register' ? authData : { email: authData.email, password: authData.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (authTab === 'register') {
          // Don't auto-login after registration — send them to the Sign In tab instead.
          setAuthTab('login');
          setAuthData(prev => ({ ...prev, password: '' }));
          setAuthSuccess('Account created! Please sign in with your new credentials.');
        } else {
          setCurrentUser(data);
          setChatOpen(false);
          localStorage.setItem('algorithmic_user', JSON.stringify(data));
          fetchHistory(data.email);
          fetchSessions(data.email);
          fetchChatHistory(data.email);
        }
      } else {
        setAuthError(data.detail || 'Authentication failed.');
      }
    } catch (err) {
      setAuthError('Cannot reach FastAPI backend server on port 8000.');
    } finally {
      setAuthLoading(false);
    }
  };

  const openProfileModal = () => {
    setProfileForm({
      name: currentUser?.name || '',
      age: currentUser?.age || 21,
      gender: currentUser?.gender || 'Non-binary'
    });
    setProfileError('');
    setProfileEditMode(false);
    setProfileModalOpen(true);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          name: profileForm.name,
          age: parseInt(profileForm.age),
          gender: profileForm.gender
        })
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data);
        localStorage.setItem('algorithmic_user', JSON.stringify(data));
        setProfileEditMode(false);
      } else {
        setProfileError(data.detail || 'Could not update profile.');
      }
    } catch (err) {
      setProfileError('Cannot reach the backend server on port 8000.');
    } finally {
      setProfileSaving(false);
    }
  };

  // Onboarding State
  const [onboardAge, setOnboardAge] = useState('');
  const [onboardGender, setOnboardGender] = useState('Non-binary');
  const [onboardScreenTime, setOnboardScreenTime] = useState(4.5);
  const [onboardSleepTime, setOnboardSleepTime] = useState(7.5);
  const [onboardSocialActivityHours, setOnboardSocialActivityHours] = useState(2.0);
  const [onboardPlatformHours, setOnboardPlatformHours] = useState({
    Instagram: 1, TikTok: 1, YouTube: 1, Facebook: 1, WhatsApp: 1, 'X/Twitter': 1
  });
  const [onboardSaving, setOnboardSaving] = useState(false);
  const [onboardError, setOnboardError] = useState('');

  const handleOnboardingSubmit = async (e) => {
    e.preventDefault();
    setOnboardSaving(true);
    setOnboardError('');

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          age: parseInt(onboardAge) || currentUser.age,
          gender: onboardGender,
          avg_screen_time: parseFloat(onboardScreenTime),
          avg_sleep_time: parseFloat(onboardSleepTime),
          avg_social_activity_time: parseFloat(onboardSocialActivityHours),
          platform_hours: onboardPlatformHours
        })
      });
      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data);
        localStorage.setItem('algorithmic_user', JSON.stringify(data));
        setSelectedPlatforms(Object.keys(onboardPlatformHours));
        setPlatformHours(prev => ({ ...prev, ...onboardPlatformHours }));
        setAutoSleepHours(parseFloat(onboardSleepTime));
        setAutoSocialActivityHours(parseFloat(onboardSocialActivityHours));
        setActiveTab('dashboard');
      } else {
        setOnboardError(data.detail || 'Could not save your routine.');
      }
    } catch (err) {
      setOnboardError('Cannot reach the backend server on port 8000.');
    } finally {
      setOnboardSaving(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setResult(null);
    setHistory([]);
    setBookedSessions([]);
    setChatMessages([DEFAULT_CHAT_MESSAGE]);
    setChatInput('');
    localStorage.removeItem('algorithmic_user');
  };

  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { stress, anxiety } = calculateAccurateMentalProfile(
      autoScreenTime,
      autoSleepHours,
      platformHours,
      autoSocialActivityHours,
      selectedPlatforms
    );

    const payload = {
      user_email: currentUser?.email,
      user: {
        name: currentUser?.name || 'User',
        age: parseInt(currentUser?.age || 21),
        gender: currentUser?.gender || 'Non-binary'
      },
      habits: {
        screen_time: parseFloat(autoScreenTime),
        sleep_hours: parseFloat(autoSleepHours),
        social_activity_hours: parseFloat(autoSocialActivityHours),
        social_media_platform: selectedPlatforms,
        platform_hours: platformHours
      },
      mental_profile: {
        stress_level: stress,
        anxiety_level: anxiety,
        depression_level: parseFloat(depressionLevel)
      }
    };

    try {
      let res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // If backend was running older integer-only validator, auto-retry with rounded integers
      if (res.status === 422) {
        const retryPayload = {
          ...payload,
          mental_profile: {
            ...payload.mental_profile,
            stress_level: Math.round(stress),
            anxiety_level: Math.round(anxiety)
          }
        };
        const retryRes = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(retryPayload)
        });
        if (retryRes.ok) {
          res = retryRes;
        }
      }

      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setHistory(prev => [data, ...prev.filter(p => (p.id !== data.id && p._id !== data._id))]);
        if (currentUser?.email) {
          fetchHistory(currentUser.email);
        }
      } else {
        let detail = '';
        try {
          const errData = await res.json();
          detail = errData.detail ? JSON.stringify(errData.detail) : '';
        } catch (_) {}
        console.error('Assessment submit failed:', res.status, detail);
        alert(`Evaluation failed (HTTP ${res.status}). ${detail || 'Check the backend terminal for the error.'}`);
      }
    } catch (err) {
      console.error('Assessment submit network error:', err);
      alert('Error connecting to backend. Is the backend server running and reachable at /api?');
    } finally {
      setLoading(false);
    }
  };

  const handleBookSessionSubmit = async (e) => {
    e.preventDefault();
    if (!bookingModal.counselor || !currentUser) return;

    try {
      const res = await fetch('/api/counseling/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email: currentUser.email,
          counselor_id: bookingModal.counselor.id,
          counselor_name: bookingModal.counselor.name,
          session_date: bookingForm.date,
          session_time: bookingForm.time,
          topic: bookingForm.topic,
          notes: bookingForm.notes
        })
      });
      if (res.ok) {
        alert(`Session successfully booked with ${bookingModal.counselor.name}!`);
        setBookingModal({ open: false, counselor: null });
        fetchSessions(currentUser.email);
      }
    } catch (err) {
      alert('Error booking session.');
    }
  };

  const handleSendChatMessage = async (e, overrideText) => {
    if (e && e.preventDefault) e.preventDefault();
    const userMsg = (overrideText ?? chatInput).trim();
    if (!userMsg) return;

    setChatMessages(prev => [...prev, { sender: 'user', message: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/counseling/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: currentUser?.email, message: userMsg, history: chatMessages })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [...prev, { sender: 'ai', message: data.reply }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', message: 'I am here to support you! Take a deep breath.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const CHAT_SUGGESTIONS = [
    'Help me sleep better',
    'I feel anxious about screen time',
    'Give me doomscrolling tips'
  ];

  const getGreetingWord = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const chatScrollRef = React.useRef(null);
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, chatLoading, chatOpen]);

  return (
    <div className={currentUser && !currentUser.onboarding_completed ? 'onboard-shell' : 'app-viewport'}>
      {/* Navbar */}
      {(!currentUser || currentUser.onboarding_completed) && (
        <nav className="navbar">
          <div className="brand-wrapper">
            <div className="brand-logo">🪞</div>
            <div>
              <h1 className="brand-title">The Algorithmic Mirror</h1>
            </div>
          </div>

          {currentUser && currentUser.onboarding_completed && (
            <div className="nav-tabs-bar nav-tabs-bar-inline">
              <button className={`nav-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                <Activity size={18} /> Habit Analytics & AI Risk
              </button>
              <button className={`nav-tab-btn ${activeTab === 'zen' ? 'active' : ''}`} onClick={() => setActiveTab('zen')}>
                <Sparkles size={18} /> Stress Relief & Bubble Pop 🫧
              </button>
            </div>
          )}

          {currentUser && (
            <div className="user-nav-badge" onClick={openProfileModal} role="button" title="View Profile">
              <div className="avatar-ring">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {currentUser.name}
                </div>
              </div>
              <button
                className="logout-icon-btn"
                onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                title="Sign Out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </nav>
      )}

      {/* Auth vs Workspace */}
      {!currentUser ? (
        <section className="auth-hero">
          <div className="auth-headline">
            <h2>Decode Your Digital Habits & Mind.</h2>
            <p>
              An AI-driven behavioral analytics & counseling framework exploring screen time, sleep efficiency, and 1-on-1 mental health support for Gen Z.
            </p>
          </div>

          <div className="auth-card-glass">
            <div className="auth-tab-group">
              <button className={`auth-tab-btn ${authTab === 'login' ? 'active' : ''}`} onClick={() => { setAuthTab('login'); setAuthError(''); setAuthSuccess(''); }}>
                Sign In
              </button>
              <button className={`auth-tab-btn ${authTab === 'register' ? 'active' : ''}`} onClick={() => { setAuthTab('register'); setAuthError(''); setAuthSuccess(''); }}>
                Register
              </button>
            </div>

            {authError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {authError}
              </div>
            )}

            {authSuccess && (
              <div style={{ background: 'rgba(52, 211, 153, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {authSuccess}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authTab === 'register' && (
                <div className="form-field">
                  <label className="field-label">Full Name</label>
                  <div className="input-box-wrap">
                    <User className="input-icon" size={17} />
                    <input
                      type="text"
                      className="styled-input"
                      placeholder="Alex Chen"
                      value={authData.name}
                      onChange={(e) => setAuthData({ ...authData, name: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-field">
                <label className="field-label">Email Address</label>
                <div className="input-box-wrap">
                  <Mail className="input-icon" size={17} />
                  <input
                    type="email"
                    className="styled-input"
                    placeholder="alex@example.com"
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">Password</label>
                <div className="input-box-wrap">
                  <Lock className="input-icon" size={17} />
                  <input
                    type="password"
                    className="styled-input"
                    placeholder="••••••••"
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary-glow" disabled={authLoading}>
                {authLoading ? 'Processing...' : (authTab === 'login' ? 'Sign In to Portal' : 'Create Account')}
              </button>
            </form>
          </div>
        </section>
      ) : !currentUser.onboarding_completed ? (
        <section className="onboard-page">
          <div className="onboard-grid">
            <div className="onboard-form-panel">
              <div className="onboard-eyebrow">LET'S GET ORIENTED</div>
              <h2 className="onboard-title">Set Up Your Profile</h2>
              <p className="onboard-subtitle">Help us understand your digital routine.</p>

              {onboardError && (
                <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  {onboardError}
                </div>
              )}

              <form onSubmit={handleOnboardingSubmit}>
                <div className="onboard-field">
                  <label className="onboard-label">Age & Gender</label>
                  <div className="onboard-two-col onboard-age-gender-col">
                    <div>
                      <div className="onboard-sublabel">Age</div>
                      <input
                        type="number"
                        className="onboard-input"
                        placeholder="Age"
                        min="10"
                        max="100"
                        value={onboardAge}
                        onChange={(e) => setOnboardAge(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <div className="onboard-sublabel">Gender</div>
                      <select
                        className="onboard-input"
                        value={onboardGender}
                        onChange={(e) => setOnboardGender(e.target.value)}
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Non-binary</option>
                        <option>Prefer not to say</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="onboard-field">
                  <div className="onboard-slider-header">
                    <label className="onboard-label" style={{ marginBottom: 0 }}>Average Daily Sleep Time</label>
                    <span className="onboard-slider-value">{onboardSleepTime}h</span>
                  </div>
                  <input
                    type="range"
                    className="onboard-range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={onboardSleepTime}
                    onChange={(e) => setOnboardSleepTime(parseFloat(e.target.value))}
                  />
                  <div className="onboard-range-endcaps">
                    <span>3 hours</span>
                    <span>12 hours</span>
                  </div>
                </div>

                <div className="onboard-field">
                  <div className="onboard-slider-header">
                    <label className="onboard-label" style={{ marginBottom: 0 }}>Average Daily Screen Time</label>
                    <span className="onboard-slider-value">{onboardScreenTime}h</span>
                  </div>
                  <input
                    type="range"
                    className="onboard-range"
                    min="1"
                    max="12"
                    step="0.5"
                    value={onboardScreenTime}
                    onChange={(e) => setOnboardScreenTime(parseFloat(e.target.value))}
                  />
                  <div className="onboard-range-endcaps">
                    <span>1 hour</span>
                    <span>12 hours</span>
                  </div>
                </div>

                <div className="onboard-field">
                  <div className="onboard-slider-header">
                    <label className="onboard-label" style={{ marginBottom: 0 }}>Average Daily Social Activity Hours</label>
                    <span className="onboard-slider-value">{onboardSocialActivityHours}h</span>
                  </div>
                  <input
                    type="range"
                    className="onboard-range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={onboardSocialActivityHours}
                    onChange={(e) => setOnboardSocialActivityHours(parseFloat(e.target.value))}
                  />
                  <div className="onboard-range-endcaps">
                    <span>0 hours</span>
                    <span>10 hours</span>
                  </div>
                  <div className="onboard-sublabel" style={{ marginTop: '0.35rem' }}>Time spent on offline / in-person social activities daily</div>
                </div>

                <div className="onboard-field">
                  <label className="onboard-label">Social platforms</label>
                  <div className="onboard-sublabel" style={{ marginBottom: '0.6rem' }}>daily average</div>
                  {Object.keys(onboardPlatformHours).map(pId => (
                    <div key={pId} className="onboard-platform-row">
                      <span className="onboard-platform-name">{pId}</span>
                      <input
                        type="range"
                        className="onboard-range onboard-range-inline"
                        min="0"
                        max="8"
                        step="0.5"
                        value={onboardPlatformHours[pId]}
                        onChange={(e) => setOnboardPlatformHours(prev => ({ ...prev, [pId]: parseFloat(e.target.value) }))}
                      />
                      <span className="onboard-platform-value">{onboardPlatformHours[pId]}h</span>
                    </div>
                  ))}
                </div>

                <button type="submit" className="onboard-continue-btn" disabled={onboardSaving}>
                  {onboardSaving ? 'Saving...' : 'Continue'} <Send size={16} style={{ transform: 'rotate(0deg)' }} />
                </button>
              </form>
            </div>

            <div className="onboard-preview-panel">
              <div className="onboard-eyebrow">YOUR ROUTINE AT A GLANCE</div>
              <h3 className="onboard-preview-title">
                A first reflection<br /><span className="onboard-preview-accent">takes shape.</span>
              </h3>

              <div className="onboard-gauge-wrap">
                <div
                  className="onboard-gauge-ring"
                  style={{ '--gauge-pct': `${Math.min(100, (onboardScreenTime / 12) * 100)}%` }}
                >
                  <div className="onboard-gauge-inner">
                    <div className="onboard-gauge-value">{onboardScreenTime}</div>
                    <div className="onboard-gauge-label">hrs screen time</div>
                  </div>
                </div>
              </div>

              <div className="onboard-stat-row">
                <div className="onboard-stat-box">
                  <div className="onboard-stat-label">AVG SLEEP</div>
                  <div className="onboard-stat-value">{onboardSleepTime}h</div>
                </div>
                <div className="onboard-stat-box">
                  <div className="onboard-stat-label">SOCIAL ACTIVITY</div>
                  <div className="onboard-stat-value">{onboardSocialActivityHours}h</div>
                </div>
              </div>

              <div className="onboard-stat-box" style={{ width: '100%' }}>
                <div className="onboard-stat-label">SOCIAL APPS</div>
                <div className="onboard-stat-value">
                  {Object.values(onboardPlatformHours).reduce((a, b) => a + b, 0).toFixed(1)}
                  <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--border-focus)', marginLeft: '0.4rem' }}>hrs / day</span>
                </div>
                <div className="onboard-bar-track">
                  {Object.entries(onboardPlatformHours).map(([pId, hrs], idx) => {
                    const total = Object.values(onboardPlatformHours).reduce((a, b) => a + b, 0) || 1;
                    const pct = (hrs / total) * 100;
                    const shades = ['#0284c7', '#38bdf8', '#0369a1', '#7dd3fc', '#0ea5e9'];
                    return (
                      <div
                        key={pId}
                        className="onboard-bar-segment"
                        style={{ width: `${pct}%`, background: shades[idx % shades.length] }}
                        title={`${pId}: ${hrs}h`}
                      />
                    );
                  })}
                </div>
              </div>

              <p className="onboard-footnote">We'll use this as a starting point, never a judgment.</p>
            </div>
          </div>
        </section>
      ) : (
        <div>

          {/* TAB 1: DASHBOARD (Side-by-Side 2 Column Layout) */}
          {activeTab === 'dashboard' && (
            <>
              {/* QUICK STATS ROW: 4 compact boxes, full width above both panels */}
              <div className="quick-stats-grid quick-stats-grid-top">
                <div className="quick-stat-box quick-stat-readonly">
                  <div className="quick-stat-icon-badge" style={{ background: 'rgba(2, 132, 199, 0.12)', color: 'var(--border-focus)' }}>
                    <Smartphone size={16} />
                  </div>
                  <div className="quick-stat-label">Screen Time</div>
                  <div className="quick-stat-value" style={{ color: 'var(--border-focus)' }}>{autoScreenTime}h</div>
                </div>
                <div className="quick-stat-box quick-stat-readonly">
                  <div className="quick-stat-icon-badge" style={{ background: 'rgba(79, 70, 229, 0.12)', color: 'var(--indigo-glow)' }}>
                    <Moon size={16} />
                  </div>
                  <div className="quick-stat-label">Sleep</div>
                  <div className="quick-stat-value" style={{ color: 'var(--indigo-glow)' }}>{autoSleepHours}h</div>
                </div>
                {/* Single Combined Box - Displays Risk Category Badge */}
                <div className="quick-stat-box quick-stat-readonly quick-stat-combined">
                  {result ? (
                    <div className={`risk-pill-badge risk-pill-${(result.recommendation.risk_category || '').replace(/\s+/g, '-')}`} style={{ margin: 0, fontSize: '0.95rem', padding: '0.6rem 1.8rem' }}>
                      <Zap size={16} /> {result.recommendation.risk_category} ({result.recommendation.risk_score}%)
                    </div>
                  ) : (
                    <div className="risk-pill-badge" style={{ margin: 0, background: '#f8fafc', color: 'var(--text-muted)', border: '1px solid var(--border-glass-light)', fontSize: '0.88rem' }}>
                      <Zap size={14} /> Evaluation Pending
                    </div>
                  )}
                </div>
              </div>

            <main className="dashboard-grid">
              {/* Left Column: Digital Habits & Behavior */}
              <section className="panel-card">
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div className="panel-icon-badge" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                      <Activity size={22} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Digital Habits & Behavior</h3>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Select multiple platforms & view auto-calculated totals</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="progress-graph-btn"
                    onClick={() => setProgressModalOpen(true)}
                    title="View Mental Health Progress Graph"
                  >
                    <TrendingUp size={16} />
                    <span>Progress Graph</span>
                  </button>
                </div>

                <form onSubmit={handleAssessmentSubmit}>
                  {/* MULTI-SELECT PLATFORMS GRID */}
                  <div className="slider-group">
                    <label className="field-label">
                      <span>Social Media Platforms (Multi-Select)</span>
                      <span style={{ color: 'var(--border-focus)', fontSize: '0.8rem', fontWeight: 700 }}>{selectedPlatforms.length} selected</span>
                    </label>
                    <div className="platform-grid">
                      {SOCIAL_PLATFORMS.map(p => {
                        const isSelected = selectedPlatforms.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            className={`platform-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => togglePlatform(p.id)}
                            style={{ position: 'relative' }}
                          >
                            {isSelected && (
                              <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'var(--border-focus)', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={10} color="#fff" />
                              </div>
                            )}
                            <span className="platform-icon" style={{ background: p.bg, color: p.fg }}>{p.icon}</span>
                            <span className="platform-name">{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* PER-SELECTED PLATFORM HOURS SLIDERS */}
                  <div className="usage-breakdown-box">
                    <div className="breakdown-title">
                      Per-Platform Usage Breakdown
                    </div>
                    {selectedPlatforms.map(pId => (
                      <div key={pId} style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span>{pId} Time</span>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{platformHours[pId]} hrs</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="8.0"
                          step="0.5"
                          className="range-track-custom"
                          value={platformHours[pId] || 1.0}
                          onChange={(e) => handlePlatformHoursChange(pId, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>

                  {/* SLEEP */}
                  <div className="usage-breakdown-box">
                    <div className="breakdown-title">Sleep</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span>Average Sleep Time</span>
                      <span style={{ fontWeight: 700, color: 'var(--indigo-glow)' }}>{autoSleepHours} hrs</span>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      className="range-track-custom"
                      value={autoSleepHours}
                      onChange={(e) => setAutoSleepHours(parseFloat(e.target.value))}
                    />
                  </div>

                  <button type="submit" className="btn-primary-glow" disabled={loading}>
                    {loading ? 'Evaluating via Gemini AI...' : 'Run Risk & Wellness Prediction'}
                    <Sparkles size={18} />
                  </button>
                </form>
              </section>

              {/* Right Column: Predictive AI Insights */}
              <section className="panel-card">
                <div className="panel-header">
                  <div className="panel-icon-badge" style={{ background: 'rgba(236, 72, 153, 0.15)', color: 'var(--risk-high)' }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Predictive AI Insights</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Analytical wellness evaluation & advisory</p>
                  </div>
                </div>

                {result ? (
                  <div>
                    <div className="summary-box">
                      <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                        Analytical Summary
                      </h5>
                      <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>{result.recommendation.summary}</p>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h5 style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        Advices (in bullet form)
                      </h5>
                      <span className={`risk-pill-badge risk-pill-${(result.recommendation.risk_category || '').replace(/\s+/g, '-')}`} style={{ margin: 0, padding: '0.25rem 0.8rem', fontSize: '0.78rem' }}>
                        {result.recommendation.risk_category} ({result.recommendation.risk_score}%)
                      </span>
                    </div>
                    <ul className="advice-bullet-list">
                      {result.recommendation.recommendation_advice.map((advice, idx) => (
                        <li key={idx} className="advice-bullet-item">
                          <span className="advice-bullet-marker">*</span>
                          <span className="advice-bullet-text">{advice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
                    <Brain size={52} color="rgba(148, 163, 184, 0.4)" style={{ marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.95rem' }}>Select social media platforms on the left to calculate screen time and trigger AI evaluation.</p>
                  </div>
                )}


                {/* Decompression Quick Banner */}
                <div className="zen-quick-banner" onClick={() => setActiveTab('zen')}>
                  <div className="zen-quick-content">
                    <span className="zen-quick-icon">🫧</span>
                    <div>
                      <div className="zen-quick-title">Feeling Stressed? Try Bubble Pop & Zen Studio</div>
                      <div className="zen-quick-desc">Tactile bubble wrap popping & art therapy canvas to decompress</div>
                    </div>
                  </div>
                  <button type="button" className="zen-quick-btn">Play Now →</button>
                </div>
              </section>
            </main>
            </>
          )}

          {/* TAB 2: COUNSELING */}
          {activeTab === 'counseling' && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.3rem' }}>Certified Digital Wellness Counselors</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  Connect 1-on-1 with licensed therapists specializing in Gen Z digital addiction, sleep restoration, and academic anxiety.
                </p>
              </div>

              <div className="counselor-grid">
                {counselors.map(c => (
                  <div key={c.id} className="counselor-card">
                    <div>
                      <div className="counselor-header">
                        <div className="counselor-avatar">{c.avatar_url}</div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{c.title}</div>
                        </div>
                      </div>
                      <span className="specialty-tag">{c.specialization}</span>
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0.75rem 0' }}>
                        {c.bio}
                      </p>
                      {c.signature_advice && (
                        <div className="counselor-advice-box">
                          <CheckCircle2 size={16} color="var(--border-focus)" style={{ minWidth: '16px', marginTop: '2px' }} />
                          <span>{c.signature_advice}</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-primary-glow"
                      style={{ marginTop: '1rem', width: '100%', fontSize: '0.9rem', padding: '0.75rem' }}
                      onClick={() => setBookingModal({ open: true, counselor: c })}
                    >
                      <Calendar size={16} /> Book 1-on-1 Session
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ZEN STRESS RELIEF & BUBBLE POP */}
          {activeTab === 'zen' && (
            <ZenRelief userName={currentUser?.name} />
          )}
        </div>
      )}

      {/* Profile Modal */}
      {profileModalOpen && currentUser && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Your Profile</h3>
              <button
                onClick={() => setProfileModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem' }}>
              <div className="avatar-ring" style={{ width: '56px', height: '56px', fontSize: '1.4rem' }}>
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{currentUser.name}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentUser.email}</div>
              </div>
            </div>

            {profileError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#f43f5e', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                {profileError}
              </div>
            )}

            {!profileEditMode ? (
              <div>
                <div className="history-item-row">
                  <span style={{ color: 'var(--text-muted)' }}>Email</span>
                  <span style={{ fontWeight: 700 }}>{currentUser.email}</span>
                </div>
                <div className="history-item-row">
                  <span style={{ color: 'var(--text-muted)' }}>Age</span>
                  <span style={{ fontWeight: 700 }}>{currentUser.age}</span>
                </div>
                <div className="history-item-row">
                  <span style={{ color: 'var(--text-muted)' }}>Gender</span>
                  <span style={{ fontWeight: 700 }}>{currentUser.gender}</span>
                </div>

                <button
                  className="btn-primary-glow"
                  style={{ marginTop: '1.25rem' }}
                  onClick={() => setProfileEditMode(true)}
                >
                  Edit Profile
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileSave}>
                <div className="form-field">
                  <label className="field-label">Full Name</label>
                  <div className="input-box-wrap">
                    <User className="input-icon" size={17} />
                    <input
                      type="text"
                      className="styled-input"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="field-label">Age</label>
                  <input
                    type="number"
                    className="styled-select"
                    min="10"
                    max="100"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                    required
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">Gender</label>
                  <select
                    className="styled-select"
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Non-binary</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button
                    type="button"
                    className="btn-primary-glow"
                    style={{ background: 'var(--bg-card-hover)', color: 'var(--text-primary)', border: '1.5px solid var(--border-glass-light)' }}
                    onClick={() => setProfileEditMode(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary-glow" disabled={profileSaving}>
                    {profileSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Booking Modal */}
      {bookingModal.open && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Schedule 1-on-1 Session</h3>
              <button onClick={() => setBookingModal({ open: false, counselor: null })} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookSessionSubmit}>
              <div className="form-field">
                <label className="field-label">Preferred Session Date</label>
                <input
                  type="date"
                  className="styled-input"
                  style={{ paddingLeft: '1.1rem' }}
                  value={bookingForm.date}
                  onChange={(e) => setBookingForm({ ...bookingForm, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-field">
                <label className="field-label">Session Time Slot</label>
                <select
                  className="styled-select"
                  value={bookingForm.time}
                  onChange={(e) => setBookingForm({ ...bookingForm, time: e.target.value })}
                >
                  <option value="10:00">10:00 AM EST</option>
                  <option value="14:00">02:00 PM EST</option>
                  <option value="16:30">04:30 PM EST</option>
                  <option value="19:00">07:00 PM EST</option>
                </select>
              </div>

              <button type="submit" className="btn-primary-glow" style={{ marginTop: '1rem' }}>
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mental Health Progress Graph Modal */}
      <MentalProgressModal
        isOpen={progressModalOpen}
        onClose={() => setProgressModalOpen(false)}
        history={history}
        currentAssessment={result}
        currentUser={currentUser}
        activeHabits={{
          screenTime: autoScreenTime,
          sleepHours: autoSleepHours,
          socialHours: autoSocialActivityHours,
          platformHours: platformHours,
          platforms: selectedPlatforms,
          stress: stressLevel,
          anxiety: anxietyLevel
        }}
      />
      {/* Floating Chatbot Widget & Compact Circular Icon (Bottom Right Corner) */}
      {currentUser && currentUser.onboarding_completed && (
        <div className="floating-chatbot-container">
          {chatOpen && (
            <div className={`floating-chat-widget ${chatExpanded ? 'expanded' : ''}`}>
              <div className="floating-chat-header">
                <div className="floating-chat-header-info">
                  <div className="floating-chat-avatar-wrapper">
                    <div className="floating-chat-avatar">
                      <MessageCircle size={17} />
                    </div>
                    <span className="floating-chat-online-badge"></span>
                  </div>
                  <div>
                    <div className="floating-chat-header-title">MindCare AI Chatbot</div>
                    <div className="floating-chat-header-status">
                      <span className="status-dot"></span> Online • Ready to chat
                    </div>
                  </div>
                </div>

                <div className="floating-chat-controls">
                  <button
                    type="button"
                    className="floating-chat-control-btn"
                    onClick={() => setChatExpanded(prev => !prev)}
                    title={chatExpanded ? "Standard size" : "Expand size"}
                    aria-label={chatExpanded ? "Standard size" : "Expand size"}
                  >
                    {chatExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                  </button>
                  <button
                    type="button"
                    className="floating-chat-control-btn"
                    onClick={() => setChatOpen(false)}
                    title="Close Chat"
                    aria-label="Close Chat"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {chatMessages.length <= 1 ? (
                <div className="chat-welcome-state floating-welcome">
                  <div className="chat-welcome-icon" style={{ width: '42px', height: '42px', marginBottom: '0.5rem' }}>
                    <Brain size={20} />
                  </div>
                  <div className="chat-welcome-greeting" style={{ fontSize: '1.1rem' }}>
                    {getGreetingWord()}
                    {currentUser?.name ? <>, <span className="chat-welcome-name">{currentUser.name}</span></> : null}
                  </div>
                  <div className="chat-welcome-subtitle" style={{ fontSize: '0.8rem', marginBottom: '0.85rem' }}>
                    How can I help you today?
                  </div>
                  <div className="chat-suggestion-row">
                    {CHAT_SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chat-suggestion-chip"
                        onClick={() => handleSendChatMessage(null, s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="floating-chat-scroll" ref={chatScrollRef}>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-row ${msg.sender}`}>
                      {msg.sender === 'ai' && (
                        <div className="chat-row-avatar"><Brain size={14} /></div>
                      )}
                      <div className={`chat-bubble ${msg.sender}`}>
                        <FormattedChatMessage message={msg.message} sender={msg.sender} />
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="chat-row ai">
                      <div className="chat-row-avatar"><Brain size={13} /></div>
                      <div className="chat-bubble ai">
                        <span className="chat-typing-dots"><span></span><span></span><span></span></span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSendChatMessage} className="chat-input-bar floating-chat-input">
                <input
                  ref={chatInputRef}
                  type="text"
                  className="styled-input"
                  placeholder="Ask MindCare AI..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button type="submit" className="btn-primary-glow chat-send-btn" disabled={chatLoading || !chatInput.trim()}>
                  <Send size={15} />
                </button>
              </form>
            </div>
          )}

          {/* Recognized Floating Chat Launcher: Chat Bubble Icon + "Chat with AI" Pill */}
          <div className="floating-chat-trigger-group">
            {!chatOpen && (
              <div 
                className="floating-chat-hint-pill"
                onClick={() => {
                  setChatOpen(true);
                  setTimeout(() => chatInputRef.current?.focus(), 150);
                }}
                role="button"
                tabIndex={0}
                title="Click to chat with AI"
              >
                <span className="hint-pill-wave">✨</span>
                <span className="hint-pill-text">Chat with AI</span>
              </div>
            )}

            <button
              type="button"
              className={`floating-chat-icon-btn ${chatOpen ? 'active' : ''}`}
              onClick={() => {
                setChatOpen(prev => !prev);
                if (!chatOpen) setTimeout(() => chatInputRef.current?.focus(), 150);
              }}
              title={chatOpen ? 'Close Chatbot' : 'Chat with MindCare AI'}
              aria-label="AI MindCare Chatbot"
            >
              <div className="floating-chat-icon-inner">
                {chatOpen ? <X size={22} /> : <MessageCircle size={24} />}
              </div>
              {!chatOpen && <span className="floating-chat-online-dot" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './lib/db';
import { supabase } from './lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { Home, Users, Volume2, VolumeX, LogOut, Settings, Inbox, Share, Trash2 } from 'lucide-react';
import { buildPayNowPayload, normalizeMobile } from './lib/paynow';
import { feedback, isMuted, setMuted } from './lib/feedback';
import {
  isCloudConfigured,
  createCloudEvent,
  verifyPin,
  fetchCloudTransactions,
  addCloudTransaction,
  subscribeCloudTransactions,
  deleteCloudEvent,
  updateCloudEventMembers,
} from './lib/cloud';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './index.css';

// ---------------------------------------------------------------------------
// Auth Context
// ---------------------------------------------------------------------------
const AuthContext = createContext(null);
function useAuth() { return useContext(AuthContext); }

function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'var(--font-family)' }}>
        <p style={{ opacity: 0.6 }}>Loading…</p>
      </div>
    );
  }

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Login Screen
// ---------------------------------------------------------------------------
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) alert(error.message);
    setLoading(false);
  };

  const signInWithEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) {
      alert(error.message);
    } else {
      setEmailSent(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem', backgroundColor: 'var(--bg-color)' }}>
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--primary-color)', marginBottom: '0.25rem' }}>Recipro</h1>
        <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.9rem' }}>
          Digital Angpow & Reciprocity Tracker
        </p>

        <button
          className="btn press"
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '0.75rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            backgroundColor: '#fff', color: '#333', border: '1px solid var(--border-color)',
            borderRadius: '0.75rem', fontWeight: 600, fontSize: '0.95rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.998 23.998 0 000 24c0 3.77.9 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
        </div>

        {emailSent ? (
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '0.75rem', color: '#166534' }}>
            <strong>Check your email!</strong>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>We sent a magic link to {email}. Click it to sign in.</p>
          </div>
        ) : (
          <form onSubmit={signInWithEmail} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
            />
            <button type="submit" className="btn btn-primary press" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onboarding Walkthrough
// ---------------------------------------------------------------------------
const WALKTHROUGH_STEPS = [
  {
    title: 'Welcome to Recipro! 🎉',
    body: 'Track angpow received at your events (weddings, funerals, birthdays) and never lose track of who gave what.',
    icon: '🏠',
  },
  {
    title: 'Create an Event',
    body: 'Tap "+ Create Event" on the Dashboard. Add family members like "Groom" and "Bride\'s Mom" — guests will be tagged to them.',
    icon: '📋',
  },
  {
    title: 'Share with Family',
    body: 'Enable sharing to get a link + PIN. Send it to relatives helping at the door — everyone records into the same live ledger!',
    icon: '👥',
  },
  {
    title: 'Record Angpow',
    body: 'Use the 💰 Ledger tab. Pick the guest name (or pull from your phone contacts), select who they\'re related to, and enter the amount.',
    icon: '💰',
  },
  {
    title: 'Close & Track Reciprocity',
    body: 'When the event ends, hit "Close Event". Balances are saved locally on your phone. The Reciprocity tab shows who you owe back and how much.',
    icon: '🔄',
  },
];

const WALKTHROUGH_KEY = 'recipro_walkthrough_done';

function Walkthrough({ onDone }) {
  useEffect(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: 'header',
          popover: { title: 'Welcome to Recipro! 🎉', description: 'Track angpow received at your events (weddings, funerals, birthdays) and never lose track of who gave what.', side: 'bottom', align: 'start' }
        },
        {
          element: '#create-event-btn',
          popover: { title: 'Create an Event', description: 'Tap "+ Create Event" to start a new ledger. Add family members like "Groom" and "Bride\'s Mom" — guests will be tagged to them.', side: 'bottom', align: 'start' }
        },
        {
          element: '#my-events-list',
          popover: { title: 'Share with Family', description: 'When you create an event, you can enable sharing to get a link + PIN. Send it to relatives helping at the door — everyone records into the same live ledger!', side: 'top', align: 'start' }
        },
        {
          element: '#nav-reciprocity',
          popover: { title: 'Track Reciprocity', description: 'When the event ends, hit "Close Event". Balances are saved locally. The Reciprocity tab shows who you owe back and how much.', side: 'top', align: 'center' }
        }
      ],
      onDestroyStarted: () => {
        driverObj.destroy();
        try { localStorage.setItem(WALKTHROUGH_KEY, '1'); } catch {}
        onDone();
      }
    });

    // Short delay to ensure DOM is ready
    setTimeout(() => driverObj.drive(), 200);

    return () => driverObj.destroy();
  }, [onDone]);

  return null;
}

function useShowWalkthrough() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(WALKTHROUGH_KEY)) setShow(true); } catch {}
  }, []);
  return [show, () => setShow(false)];
}

// ---------------------------------------------------------------------------
// Theme helper
// ---------------------------------------------------------------------------
function useBodyTheme(theme) {
  useEffect(() => {
    document.body.className = theme ? `theme-${theme}` : '';
    // We do NOT return a cleanup function here, because in React 18
    // the unmount of the old page can run its cleanup AFTER the mount 
    // of the new page runs its setup, which would accidentally erase the theme.
    // Since every page calls useBodyTheme on mount, it's safe to omit cleanup.
  }, [theme]);
}

// ---------------------------------------------------------------------------
// Shell: Header + Bottom Nav
// ---------------------------------------------------------------------------
function Header() {
  const session = useAuth();
  const [muted, setMutedState] = useState(isMuted());

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) feedback('tap');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
      <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>Recipro</h1>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {session?.user?.user_metadata?.avatar_url && (
          <img src={session.user.user_metadata.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
        )}
        <button className="btn btn-outline press" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} style={{ padding: '0.5rem' }}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button className="btn btn-outline press" onClick={handleLogout} aria-label="Log out" style={{ padding: '0.5rem' }}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function Navigation() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" style={{ display: 'flex', justifyContent: 'space-around', padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', position: 'fixed', bottom: 0, width: '100%', zIndex: 900 }}>
      <Link to="/" onClick={() => feedback('tap')} style={{ color: location.pathname === '/' ? 'var(--primary-color)' : 'var(--text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        <Home size={24} />
        <span style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Dashboard</span>
      </Link>
      <Link to="/invitations" onClick={() => feedback('tap')} style={{ color: location.pathname === '/invitations' ? 'var(--primary-color)' : 'var(--text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        <Inbox size={24} />
        <span style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Invitations</span>
      </Link>
      <Link to="/reciprocity" id="nav-reciprocity" onClick={() => feedback('tap')} style={{ color: location.pathname === '/reciprocity' ? 'var(--primary-color)' : 'var(--text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        <Users size={24} />
        <span style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Reciprocity</span>
      </Link>
      <Link to="/settings" onClick={() => feedback('tap')} style={{ color: location.pathname === '/settings' ? 'var(--primary-color)' : 'var(--text-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none' }}>
        <Settings size={24} />
        <span style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Settings</span>
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const THEME_OPTIONS = [
  { value: 'happy', label: 'Cinnabar & Silk (新中式)' },
  { value: 'solemn', label: 'Ink Wash (水墨)' },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard() {
  useBodyTheme(null);
  const session = useAuth();
  const events = useLiveQuery(() => db.local_events.filter(e => !e.isHelper).toArray());
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState('');
  const [theme, setEventTheme] = useState('happy');
  const [pnProxy, setPnProxy] = useState('');
  const [collab, setCollab] = useState(true); // sharing ON by default
  const [pin, setPin] = useState(randomPin());
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setTitle('');
    setEventTheme('happy');
    setPnProxy('');
    setCollab(true);
    setPin(randomPin());
  };

  const addMember = () => {
    const name = memberInput.trim();
    if (name && !members.includes(name)) {
      setMembers([...members, name]);
    }
    setMemberInput('');
  };

  const removeMember = (name) => {
    setMembers(members.filter(m => m !== name));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!normalizeMobile(pnProxy)) {
      alert('Enter a valid Singapore mobile number (8 digits, starts with 8 or 9).');
      return;
    }
    setSaving(true);
    const payNow = { type: 'mobile', proxy: pnProxy.trim() };
    const hostName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Host';
    const initialMembers = [hostName];
    let shared = collab;
    let cloudId = null;
    let joinPin = null;

    if (collab) {
      if (!isCloudConfigured()) {
        alert('Cloud sync is not configured. Saving locally only.');
        shared = false;
      } else {
        joinPin = pin;
        try {
          const ev = await createCloudEvent({
            title, theme, payNow, pin: joinPin, members: initialMembers,
            ownerId: session?.user?.id || null,
          });
          cloudId = ev.id;
        } catch (err) {
          alert('Cloud sync failed (' + err.message + '). Saved locally only.');
          shared = false;
          joinPin = null;
        }
      }
    }

    await db.local_events.add({
      title,
      date: new Date().toISOString(),
      theme,
      status: 'active',
      payNow,
      shared,
      cloudId,
      pin: joinPin,
      members: initialMembers,
    });

    feedback('success', theme === 'solemn');
    setShowModal(false);
    setSaving(false);
    resetForm();
  };

  const activeEvents = events?.filter(e => e.status === 'active') || [];
  const closedEvents = events?.filter(e => e.status === 'closed') || [];

  return (
    <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>My Events</h2>
        <button id="create-event-btn" className="btn btn-primary press" onClick={() => { feedback('tap'); setShowModal(true); }}>+ Create Event</button>
      </div>

      <div id="my-events-list" style={{ display: 'grid', gap: '1rem' }}>
        {events?.length === 0 && <p>No events found. Create one!</p>}
        {activeEvents.map(ev => (
          <Link to={`/event/${ev.id}`} key={ev.id} onClick={() => feedback('tap')} style={{ textDecoration: 'none' }}>
            <div className="card press" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{ev.title}</h3>
                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '1rem' }}>Active</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                <span>{ev.shared ? '👥 Shared' : '📱 Local'}</span>
                <span>Date: {new Date(ev.date).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}

        {closedEvents.length > 0 && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, opacity: 0.8, marginBottom: '1rem' }}>Closed Events ({closedEvents.length})</summary>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {closedEvents.map(ev => (
                <Link to={`/event/${ev.id}`} key={ev.id} onClick={() => feedback('tap')} style={{ textDecoration: 'none' }}>
                  <div className="card press" style={{ cursor: 'pointer', opacity: 0.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{ev.title}</h3>
                      <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '1rem' }}>Closed</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                      <span>{ev.shared ? '👥 Shared' : '📱 Local'}</span>
                      <span>Date: {new Date(ev.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Create New Event</h3>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Event Title</label>
                <input required className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="E.g., My Wedding" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Theme</label>
                <select className="input" value={theme} onChange={e => setEventTheme(e.target.value)}>
                  {THEME_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>PayNow Number (Mobile)</label>
                <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0 0 0.5rem' }}>Guests scan the generated QR code to pay you.</p>
                <input
                  required
                  className="input"
                  value={pnProxy}
                  onChange={e => setPnProxy(e.target.value)}
                  placeholder="e.g. 9123 4567"
                  inputMode="tel"
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                  <input type="checkbox" checked={collab} onChange={e => { feedback('tap'); setCollab(e.target.checked); }} />
                  Share with family (collaborate live)
                </label>
                {collab && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, fontSize: '0.9rem' }}>Join PIN (share with helpers)</label>
                    <input className="input" value={pin} onChange={e => setPin(e.target.value)} inputMode="numeric" />
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.4rem' }}>
                      They open your event link and enter this PIN to help record angpow into the same ledger.
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-outline press" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary press" disabled={saving}>{saving ? 'Creating…' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Invitations (Helper Dashboard)
// ---------------------------------------------------------------------------
function Invitations() {
  useBodyTheme(null);
  const events = useLiveQuery(() => db.local_events.filter(e => !!e.isHelper).toArray());

  const activeEvents = events?.filter(e => e.status === 'active') || [];
  const closedEvents = events?.filter(e => e.status === 'closed') || [];

  return (
    <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Invitations</h2>
      </div>
      <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Events where you are helping as an admin.
      </p>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {events?.length === 0 && <p>No invitations found. Join via a link!</p>}
        {activeEvents.map(ev => (
          <Link to={`/event/${ev.id}`} key={ev.id} onClick={() => feedback('tap')} style={{ textDecoration: 'none' }}>
            <div className="card press" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{ev.title}</h3>
                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '1rem' }}>Active</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                <span>{ev.shared ? '👥 Shared' : '📱 Local'}</span>
                <span>Date: {new Date(ev.date).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}

        {closedEvents.length > 0 && (
          <details style={{ marginTop: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600, opacity: 0.8, marginBottom: '1rem' }}>Closed Invitations ({closedEvents.length})</summary>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {closedEvents.map(ev => (
                <Link to={`/event/${ev.id}`} key={ev.id} onClick={() => feedback('tap')} style={{ textDecoration: 'none' }}>
                  <div className="card press" style={{ cursor: 'pointer', opacity: 0.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, color: 'var(--text-color)' }}>{ev.title}</h3>
                      <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '1rem' }}>Closed</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-color)', opacity: 0.8 }}>
                      <span>{ev.shared ? '👥 Shared' : '📱 Local'}</span>
                      <span>Date: {new Date(ev.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShareCard
// ---------------------------------------------------------------------------
function ShareCard({ event }) {
  const [copied, setCopied] = useState('');
  const link = `${window.location.origin}/join/${event.cloudId}`;

  const copy = async (text, what) => {
    feedback('tap');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      alert(text);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem', borderStyle: 'dashed' }}>
      <strong style={{ display: 'block', marginBottom: '0.5rem' }}>👥 Live shared ledger</strong>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', opacity: 0.8 }}>
        Send helpers this link + PIN — everyone records into the same ledger in real time.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input className="input" readOnly value={link} onFocus={e => e.target.select()} />
        <button type="button" className="btn btn-outline press" onClick={() => copy(link, 'link')} style={{ whiteSpace: 'nowrap' }}>
          {copied === 'link' ? '✓' : 'Copy'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontWeight: 600 }}>PIN: {event.pin}</span>
        <button type="button" className="btn btn-outline press" onClick={() => copy(event.pin, 'pin')} style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>
          {copied === 'pin' ? '✓' : 'Copy PIN'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MembersPanel
// ---------------------------------------------------------------------------
function MembersPanel({ members, onUpdate, readOnly }) {
  const [input, setInput] = useState('');

  const add = () => {
    const name = input.trim();
    if (name && !members.includes(name)) {
      onUpdate([...members, name]);
    }
    setInput('');
  };

  const remove = (name) => {
    onUpdate(members.filter(m => m !== name));
  };

  return (
    <div className="card animate-fade-in">
      <h3 style={{ marginTop: 0 }}>Family Members / Admins</h3>
      <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
        These names appear in the "Related to" dropdown when recording angpow.
      </p>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            className="input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="Add name (e.g. Groom)"
          />
          <button type="button" className="btn btn-primary press" onClick={add} style={{ whiteSpace: 'nowrap' }}>+ Add</button>
        </div>
      )}
      {members.length === 0 && <p style={{ opacity: 0.6 }}>No members added yet.</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {members.map(m => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', backgroundColor: 'color-mix(in srgb, var(--primary-color) 6%, transparent)', borderRadius: '0.75rem' }}>
            <span style={{ fontWeight: 500 }}>{m}</span>
            {!readOnly && (
              <button type="button" className="btn btn-outline press" onClick={() => remove(m)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: 'red', borderColor: 'red' }}>Remove</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LedgerPanel
// ---------------------------------------------------------------------------
function LedgerPanel({ solemn, closed, transactions, members, onRecord }) {
  const [contactName, setContactName] = useState('');
  const [contactTel, setContactTel] = useState('');
  const [relation, setRelation] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');

  const selectContact = async () => {
    feedback('tap', solemn);
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          if (contacts[0].name?.length) setContactName(contacts[0].name[0]);
          if (contacts[0].tel?.length) setContactTel(contacts[0].tel[0]);
        }
      } catch {
        alert('Could not select contact.');
      }
    } else {
      alert('Contacts API not supported on this browser. Please type manually.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const ok = await onRecord({ contactName, contactTel, relation, amount: parseFloat(amount), method });
    if (ok) {
      feedback('success', solemn);
      setContactName('');
      setContactTel('');
      setRelation('');
      setAmount('');
    }
  };

  return (
    <div className="card animate-fade-in">
      <h3 style={{ marginTop: 0 }}>Record Angpow</h3>
      {closed ? (
        <p>This event is closed. Transactions can no longer be recorded.</p>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Guest Name</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input required className="input" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Name (e.g. Uncle Tan)" />
              <button type="button" className="btn btn-outline press" onClick={selectContact} style={{ whiteSpace: 'nowrap' }}>📱 Select</button>
            </div>
            <input className="input" value={contactTel} onChange={e => setContactTel(e.target.value)} placeholder="Phone Number (Optional)" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Related to</label>
            <select className="input" value={relation} onChange={e => setRelation(e.target.value)}>
              <option value="">— Select —</option>
              {(members || []).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Amount ($)</label>
            <input required type="number" step="0.01" className="input" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Payment Method</label>
            <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">Cash</option>
              <option value="paynow">PayNow</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary press" style={{ marginTop: '0.5rem' }}>Record Receipt</button>
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GuestDirectory
// ---------------------------------------------------------------------------
function GuestDirectory({ transactions }) {
  return (
    <div className="animate-fade-in">
      {transactions?.length === 0 && <div className="card"><p style={{ margin: 0 }}>No guests recorded yet.</p></div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {transactions?.map((tx, i) => (
          <div key={tx.id ?? tx.cloudTxId ?? i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ display: 'block' }}>{tx.contactName}</strong>
              {tx.relation && (
                <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--primary-color)', opacity: 0.9 }}>{tx.relation}</span>
              )}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-color)', opacity: 0.7 }}>
                {new Date(tx.date).toLocaleString()} • {String(tx.method).toUpperCase()}
              </span>
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
              +${parseFloat(tx.amount).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PayNowQRCard
// ---------------------------------------------------------------------------
function PayNowQRCard({ event }) {
  let payload = null;
  let error = null;
  if (event.payNow?.proxy) {
    try {
      payload = buildPayNowPayload({
        type: event.payNow.type,
        proxy: event.payNow.proxy,
        editable: true,
        reference: event.title,
        company: event.title,
      });
    } catch (err) {
      error = err.message;
    }
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>PayNow QR</h3>
      <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0 0 1rem' }}>
        Guests scan to pay — amount is open so they type their own.
      </p>
      {error && <p style={{ color: 'red' }}>Couldn't generate QR: {error}</p>}
      {payload && (
        <>
          <div style={{ background: '#fff', padding: '1rem', display: 'inline-block', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <QRCodeSVG value={payload} size={200} level="M" />
          </div>
          <p style={{ marginTop: '1rem', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            {event.payNow.type === 'mobile' ? normalizeMobile(event.payNow.proxy) : event.payNow.proxy}
          </p>
          <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>Reference: {event.title}</p>
        </>
      )}
      {!payload && !error && <p style={{ opacity: 0.7 }}>No PayNow details set for this event.</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EventDetail
// ---------------------------------------------------------------------------
function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const event = useLiveQuery(() => db.local_events.get(Number(id)), [id]);
  const localTxs = useLiveQuery(() => db.transactions.where({ eventId: Number(id) }).toArray(), [id]);
  const [cloudTxs, setCloudTxs] = useState([]);
  const [activeTab, setActiveTab] = useState('ledger');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const shared = !!event?.shared && !!event?.cloudId;
  const solemn = event?.theme === 'solemn';
  useBodyTheme(event?.theme || 'happy');

  useEffect(() => {
    if (!shared) return;
    let unsub = () => {};
    (async () => {
      try {
        const txs = await fetchCloudTransactions(event.cloudId);
        setCloudTxs(txs);
      } catch (e) {
        console.error('Cloud fetch failed', e);
      }
      unsub = subscribeCloudTransactions(event.cloudId, (tx) => {
        setCloudTxs(prev => prev.some(t => t.cloudTxId === tx.cloudTxId) ? prev : [...prev, tx]);
      });
    })();
    return () => unsub();
  }, [shared, event?.cloudId]);

  if (!event) return <div style={{ padding: '2rem' }}>Loading Event...</div>;

  const transactions = shared ? cloudTxs : localTxs;
  const eventMembers = event.members || [];

  const handleRecord = async ({ contactName, contactTel, relation, amount, method }) => {
    let success = false;
    if (shared) {
      try {
        await addCloudTransaction(event.cloudId, { contactName, contactTel, relation, amount, method });
        success = true;
      } catch (e) {
        alert('Could not sync to cloud (are you online?): ' + e.message);
        return false;
      }
    } else {
      await db.transactions.add({ eventId: Number(id), contactName, contactTel, relation, amount, method, date: new Date().toISOString() });
      success = true;
    }

    if (success) {
      // Prompt for review after 5 logs
      const count = parseInt(localStorage.getItem('ledger_count') || '0') + 1;
      localStorage.setItem('ledger_count', count.toString());
      if (count === 5 && !localStorage.getItem('review_prompt_done')) {
        setShowReviewModal(true);
      }
    }
    return success;
  };

  const handleUpdateMembers = async (newMembers) => {
    await db.local_events.update(Number(id), { members: newMembers });
    if (shared) {
      try {
        await updateCloudEventMembers(event.cloudId, newMembers);
      } catch (e) {
        console.error('Could not sync members to cloud', e);
      }
    }
  };

  const enableSharing = async () => {
    if (!isCloudConfigured()) {
      alert('Cloud sync is not configured, so sharing is unavailable.');
      return;
    }
    if (!window.confirm('Enable live sharing so family can help record? This creates a shareable link + PIN.')) return;
    feedback('tap', solemn);
    const newPin = randomPin();
    try {
      const ev = await createCloudEvent({ title: event.title, theme: event.theme, payNow: event.payNow, pin: newPin, members: eventMembers });
      const local = await db.transactions.where({ eventId: Number(id) }).toArray();
      for (const t of local) {
        await addCloudTransaction(ev.id, t);
      }
      await db.transactions.where({ eventId: Number(id) }).delete();
      await db.local_events.update(Number(id), { shared: true, cloudId: ev.id, pin: newPin });
      feedback('success', solemn);
    } catch (e) {
      alert('Could not enable sharing (' + e.message + '). Have you run schema.sql in Supabase?');
    }
  };

  const handleCloseEvent = async () => {
    if (!window.confirm('Close this event? This finalizes all transactions into contact balances and wipes the shared cloud copy.')) return;

    const txs = shared ? cloudTxs : await db.transactions.where({ eventId: Number(id) }).toArray();

    const deltas = {};
    for (const tx of txs) {
      const key = `${tx.contactName}|${tx.contactTel || ''}`;
      if (!deltas[key]) deltas[key] = { name: tx.contactName, tel: tx.contactTel, relation: tx.relation || '', amount: 0 };
      if (!deltas[key].relation && tx.relation) deltas[key].relation = tx.relation;
      deltas[key].amount += parseFloat(tx.amount);
    }
    for (const key in deltas) {
      const { name, tel, relation, amount } = deltas[key];
      const contact = await db.contacts.where('name').equals(name).first();
      if (contact) {
        await db.contacts.update(contact.id, { balance: (contact.balance || 0) + amount, relation: contact.relation || relation });
      } else {
        await db.contacts.add({ name, tel, relation, balance: amount });
      }
    }

    if (!shared) {
      await db.transactions.where({ eventId: Number(id) }).delete();
    } else {
      try { await deleteCloudEvent(event.cloudId); } catch (e) { console.error('Cloud delete failed', e); }
    }

    await db.local_events.update(Number(id), { status: 'closed' });
    feedback('close', solemn);
    alert('Event closed successfully!');
    navigate('/');
  };

  const TABS = [
    { key: 'ledger', label: '💰 Ledger' },
    { key: 'members', label: '👥 Members' },
    { key: 'qr', label: '📱 QR Code' },
    { key: 'directory', label: '📋 Directory' },
  ];

  return (
    <div style={{ padding: '1rem', paddingBottom: '3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <button className="btn btn-outline press" onClick={() => { feedback('tap', solemn); navigate('/'); }}>&larr; Back</button>
        <h2 style={{ margin: 0 }}>{event.title}</h2>
      </div>

      {shared && event.status === 'active' && <ShareCard event={event} />}

      {!shared && event.status === 'active' && (
        <div className="card" style={{ marginBottom: '1rem', borderStyle: 'dashed', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.85 }}>Want family to help record at the door?</span>
          <button className="btn btn-primary press" onClick={enableSharing}>Enable Sharing (link + PIN)</button>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => { feedback('tap', solemn); setActiveTab(tab.key); }}
            style={{
              padding: '0.75rem 1.25rem', background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--primary-color)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--primary-color)' : 'var(--text-color)',
              fontWeight: activeTab === tab.key ? 'bold' : 'normal', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.9rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'ledger' && <LedgerPanel solemn={solemn} closed={event.status === 'closed'} transactions={transactions} members={eventMembers} onRecord={handleRecord} />}
      {activeTab === 'members' && <MembersPanel members={eventMembers} onUpdate={handleUpdateMembers} readOnly={event.status === 'closed' || event.isHelper} />}
      {activeTab === 'qr' && <PayNowQRCard event={event} />}
      {activeTab === 'directory' && <GuestDirectory transactions={transactions} />}

      {event.status === 'active' && !event.isHelper && (
        <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
          <button className="btn btn-outline press" style={{ color: 'red', borderColor: 'red' }} onClick={handleCloseEvent}>
            Close Event (Finalize & Wipe)
          </button>
        </div>
      )}

      {showReviewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <h2 style={{ marginTop: 0, color: 'var(--primary-color)' }}>Enjoying Recipro?</h2>
            <p style={{ opacity: 0.8, fontSize: '0.95rem' }}>You've logged 5 angpows! 🎉<br/>We're building this for the community and would love to hear your thoughts or feature requests.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              <a 
                href="mailto:hello@recipro.app?subject=My Feedback on Recipro" 
                className="btn btn-primary press" 
                style={{ textDecoration: 'none' }}
                onClick={() => { localStorage.setItem('review_prompt_done', '1'); setShowReviewModal(false); }}
              >
                Send Feedback
              </a>
              <button 
                className="btn btn-outline press" 
                onClick={() => { localStorage.setItem('review_prompt_done', '1'); setShowReviewModal(false); }}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// JoinEvent (auth required, Walkthrough shown, auto-add to members)
// ---------------------------------------------------------------------------
function JoinEvent() {
  const session = useAuth();
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [pin, setPinInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  useBodyTheme('happy');

  const join = async (e) => {
    e.preventDefault();
    setChecking(true);
    setError('');
    try {
      const ev = await verifyPin(eventId, pin);
      if (!ev) {
        setError('Wrong PIN. Try again.');
      } else {
        feedback('success', ev.theme === 'solemn');
        // Auto-add this user to the event's members array
        const myName = session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Helper';
        let updatedMembers = ev.members || [];
        if (!updatedMembers.includes(myName)) {
          updatedMembers = [...updatedMembers, myName];
          try {
            await updateCloudEventMembers(ev.id, updatedMembers);
          } catch (e) {
            console.error('Failed to update members array', e);
          }
        }
        
        // Save to local dexie so they can see it in Invitations Tab
        let localEvent = await db.local_events.where({ cloudId: ev.id }).first();
        let localId;
        if (!localEvent) {
          localId = await db.local_events.add({
            title: ev.title,
            date: new Date().toISOString(),
            theme: ev.theme,
            status: 'active',
            payNow: ev.payNow,
            shared: true,
            cloudId: ev.id,
            pin: pin,
            members: updatedMembers,
            isHelper: true,
          });
        } else {
          localId = localEvent.id;
          await db.local_events.update(localId, { members: updatedMembers });
        }
        
        navigate(`/event/${localId}`);
      }
    } catch (err) {
      setError('Could not connect: ' + err.message);
    }
    setChecking(false);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '420px', margin: '0 auto' }}>
      <div className="card animate-fade-in">
        <h2 style={{ marginTop: 0 }}>Join Event</h2>
        <p style={{ opacity: 0.8 }}>Enter the PIN the host shared with you to help record angpow.</p>
        <form onSubmit={join} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input className="input" value={pin} onChange={e => setPinInput(e.target.value)} placeholder="Event PIN" inputMode="numeric" required />
          {error && <p style={{ color: 'red', margin: 0 }}>{error}</p>}
          <button type="submit" className="btn btn-primary press" disabled={checking}>{checking ? 'Joining…' : 'Join'}</button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reciprocity
// ---------------------------------------------------------------------------
function Reciprocity() {
  useBodyTheme(null);
  const contacts = useLiveQuery(() => db.contacts.toArray());

  const owe = contacts?.filter(c => c.balance > 0).sort((a, b) => b.balance - a.balance) || [];
  const owed = contacts?.filter(c => c.balance < 0).sort((a, b) => a.balance - b.balance) || [];

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL reciprocity balances? This action cannot be undone.')) {
      if (window.confirm('DOUBLE CONFIRM: Delete all records permanently?')) {
        await db.contacts.clear();
        feedback('success');
      }
    }
  };

  const handleClearIndividual = async (id, name) => {
    if (window.confirm(`Clear record for ${name}?`)) {
      if (window.confirm(`DOUBLE CONFIRM: Delete ${name}'s record permanently?`)) {
        await db.contacts.delete(id);
        feedback('success');
      }
    }
  };

  return (
    <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Reciprocity Balances</h2>
        {contacts?.length > 0 && (
          <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Trash2 size={16} /> Clear All
          </button>
        )}
      </div>

      {contacts?.length === 0 && (
        <div className="card">
          <p style={{ margin: 0 }}>No contacts yet. Close an event to finalize balances!</p>
        </div>
      )}

      {owe.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.95rem', opacity: 0.7, marginBottom: '0.75rem' }}>Their Generosity (To return with gratitude)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {owe.map(c => (
              <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block' }}>{c.name}</strong>
                  {c.relation && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.relation}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#b91c1c', textAlign: 'right' }}>
                    to gift ${parseFloat(c.balance).toFixed(2)}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); handleClearIndividual(c.id, c.name); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {owed.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.95rem', opacity: 0.7, marginBottom: '0.75rem' }}>Our Blessings Shared (To receive in due time)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {owed.map(c => (
              <div key={c.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ display: 'block' }}>{c.name}</strong>
                  {c.relation && <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{c.relation}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#166534', textAlign: 'right' }}>
                    to receive ${Math.abs(parseFloat(c.balance)).toFixed(2)}
                  </div>
                  <button onClick={(e) => { e.preventDefault(); handleClearIndividual(c.id, c.name); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
function SettingsPage() {
  useBodyTheme(null);

  return (
    <div style={{ padding: '1rem', paddingBottom: '5rem' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Settings</h2>
      
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Install App (iOS / iPhone)</h3>
        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1rem' }}>
          For the best experience, add Recipro to your home screen!
        </p>
        <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '0.5rem', color: '#334155', fontSize: '0.85rem' }}>
          1. Tap the <Share size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', margin: '0 0.2rem' }} /> <strong>Share</strong> button at the bottom of Safari.<br/>
          2. Scroll down and tap <strong>Add to Home Screen</strong>.
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Help & Tutorial</h3>
        <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1rem' }}>
          Need a refresher on how to use Recipro?
        </p>
        <button className="btn btn-primary press" onClick={() => { 
          feedback('tap'); 
          try { localStorage.removeItem('recipro_walkthrough_done'); } catch {}
          window.location.href = '/'; 
        }}>
          Launch Tutorial
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// iOS Install Prompt
// ---------------------------------------------------------------------------
function IosInstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(userAgent);
    
    // Detect Safari (exclude Chrome on iOS, though Chrome on iOS also uses share sheet, Safari is standard)
    // Actually, on iOS, all browsers use WebKit, but Safari is the one with the share button at the bottom.
    
    // Detect if already installed (standalone mode)
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    // Check if user already dismissed it
    const dismissed = localStorage.getItem('ios_install_dismissed');

    if (isIos && !isInStandaloneMode && !dismissed) {
      // Small delay so it doesn't instantly pop up
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="animate-fade-in" style={{
      position: 'fixed',
      bottom: '90px', // Just above bottom nav
      left: '50%',
      transform: 'translateX(-50%)',
      width: '90%',
      maxWidth: '350px',
      backgroundColor: 'var(--card-bg)',
      padding: '1rem',
      borderRadius: '1rem',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      border: '1px solid var(--border-color)',
      zIndex: 2000,
      textAlign: 'center'
    }}>
      <button onClick={() => {
        localStorage.setItem('ios_install_dismissed', '1');
        setShow(false);
      }} style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.5 }}>
        &times;
      </button>
      
      <div style={{ marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>Install App (iOS)</div>
      <div style={{ fontSize: '0.85rem', lineHeight: 1.5, opacity: 0.9 }}>
        Apple doesn't allow automatic installation. To add this app to your home screen:<br/><br/>
        Tap <Share size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', margin: '0 0.2rem' }} /> <strong>Share</strong> below,<br/>then tap <strong>Add to Home Screen</strong>.
      </div>
      
      {/* Down arrow pointing to Safari's share button */}
      <div style={{
        position: 'absolute',
        bottom: '-10px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0, 
        height: 0, 
        borderLeft: '10px solid transparent',
        borderRight: '10px solid transparent',
        borderTop: '10px solid var(--card-bg)'
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App Shell + Router
// ---------------------------------------------------------------------------
function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/event/') || location.pathname.startsWith('/join/');
  const [showWalkthrough, dismissWalkthrough] = useShowWalkthrough();

  return (
    <>
      <Header />
      <main style={{ minHeight: 'calc(100vh - 140px)' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/event/:id" element={<EventDetail />} />
          <Route path="/reciprocity" element={<Reciprocity />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/join/:eventId" element={<JoinEvent />} />
        </Routes>
      </main>
      {!hideNav && <Navigation />}
      {showWalkthrough && <Walkthrough onDone={dismissWalkthrough} />}
      <IosInstallPrompt />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<AuthGate />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthGate() {
  const session = useAuth();
  if (!session) return <LoginScreen />;
  return <AppShell />;
}

export default App;

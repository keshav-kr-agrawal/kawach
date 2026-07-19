import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';

export default function CitizenLoginView({ onLoginSuccess, onBackToHome }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // Handle Supabase Registration
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });

        if (signUpError) throw signUpError;

        if (data?.user && data?.session === null) {
          setMessage('Account created! Please check your email for verification, or sign in if email confirmation is disabled.');
        } else if (data?.session) {
          onLoginSuccess(data.session.access_token);
        }
      } else {
        // Handle Supabase Sign In
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (signInError) throw signInError;

        if (data?.session) {
          onLoginSuccess(data.session.access_token);
        }
      }
    } catch (err) {
      console.error('[SUPABASE AUTH ERROR]', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutofill = () => {
    setEmail('citizen@kawach.com');
    setPassword('security123');
    setError('');
    setMessage('');
  };

  return (
    <div className="min-h-full h-full bg-white flex flex-col justify-between p-4 font-sans select-text relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-100/10 via-white to-white pointer-events-none opacity-60 z-0" />
      
      {/* Top Back Nav */}
      <header className="relative z-10 w-full max-w-md mx-auto py-2">
        <button 
          onClick={onBackToHome}
          className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-amber-400/20 rounded-xl text-xs font-bold text-ink-soft hover:bg-amber-50 hover:border-[#b08850]/35 transition-all shadow-xs"
          style={{ minHeight: '44px' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Home Hub
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center py-6 w-full max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white border border-amber-400/20 rounded-3xl p-8 shadow-xs relative overflow-hidden"
        >
          {/* Top Yellow Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#E9BA26]" />

          {/* Icon Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 mb-4">
              <img src="/kawach.png" alt="KAWACH Logo" className="w-full h-full object-contain" />
            </div>
            <h2 className="text-2xl font-black text-ink font-sora tracking-tight">
              {isSignUp ? (
                <>Create <span className="font-serif italic font-normal text-[#b08850] pr-1.5">Account</span></>
              ) : (
                <>Citizen <span className="font-serif italic font-normal text-[#b08850] pr-1.5">Access</span></>
              )}
            </h2>
            <p className="text-[9px] text-[#b08850] font-bold uppercase tracking-wider mt-1 font-mono">
              {isSignUp ? 'Join Sentinel Incident Network' : 'Sentinel Decoupled Intranet'}
            </p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs text-center font-bold mb-5"
            >
              {error}
            </motion.div>
          )}

          {message && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 bg-green-50 border border-green-100 rounded-xl text-green-700 text-xs text-center font-bold mb-5"
            >
              {message}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-ink-faint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-amber-50 border border-amber-400/20 rounded-xl pl-10 pr-4 py-3.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-[#E9BA26] focus:bg-white font-semibold shadow-2xs transition-all"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-ink-soft mb-2">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-ink-faint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full bg-amber-50 border border-amber-400/20 rounded-xl pl-10 pr-4 py-3.5 text-xs text-ink placeholder-ink-faint focus:outline-none focus:border-[#E9BA26] focus:bg-white font-semibold shadow-2xs transition-all"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
            </div>

            {/* Toggle Sign In / Sign Up */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                }}
                className="text-[11px] text-ink-soft hover:text-ink font-bold transition-colors"
              >
                {isSignUp ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Already have an account? Sign In
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Need an account? Sign Up
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-3.5 pt-2">
              <button 
                type="button"
                onClick={handleAutofill}
                className="flex-1 py-3.5 px-4 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold text-ink-soft transition-colors flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#E9BA26" strokeWidth="2.5" className="w-3.5 h-3.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg> 
                Autofill
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-2 py-3.5 px-4 bg-[#E9BA26] border border-amber-950/10 hover:bg-amber-400 text-ink font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs uppercase tracking-wide font-sora"
                style={{ minHeight: '44px' }}
              >
                {loading ? 'Processing...' : (isSignUp ? 'Register' : 'Access Portal')} 
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" className="w-3.5 h-3.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </form>

        </motion.div>
      </main>

      {/* Bottom Legal Notice */}
      <footer className="relative z-10 text-center py-4 text-[9px] font-bold text-ink-faint uppercase tracking-widest font-mono">
        🔐 Authenticated securely via Supabase cryptographic protocols.
      </footer>
    </div>
  );
}

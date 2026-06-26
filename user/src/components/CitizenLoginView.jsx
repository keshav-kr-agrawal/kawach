import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, ArrowLeft, Sparkles, UserPlus, LogIn } from 'lucide-react';
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
    <div className="min-h-full h-full bg-slate-50 flex flex-col justify-between p-4 font-sans select-text relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-50/40 via-slate-50 to-slate-100 pointer-events-none opacity-60 z-0" />
      
      {/* Top Back Nav */}
      <header className="relative z-10 w-full max-w-md mx-auto py-2">
        <button 
          onClick={onBackToHome}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all shadow-2xs"
          style={{ minHeight: '44px' }}
        >
          <ArrowLeft className="w-4 h-4" /> Home Hub
        </button>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center py-6 w-full max-w-md mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100/50 relative overflow-hidden"
        >
          {/* Top Yellow Bar */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-[#ffd900]" />

          {/* Icon Brand */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 mb-4 shadow-2xs">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-outfit">
              {isSignUp ? 'Create Account' : 'Citizen Access'}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
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
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white font-semibold shadow-2xs transition-all"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Security Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white font-semibold shadow-2xs transition-all"
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
                className="text-[11px] text-slate-500 hover:text-slate-800 font-bold transition-colors"
              >
                {isSignUp ? (
                  <span className="flex items-center justify-center gap-1">
                    <LogIn className="w-3.5 h-3.5" /> Already have an account? Sign In
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <UserPlus className="w-3.5 h-3.5" /> Need an account? Sign Up
                  </span>
                )}
              </button>
            </div>

            <div className="flex gap-3.5 pt-2">
              <button 
                type="button"
                onClick={handleAutofill}
                className="flex-1 py-3.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5"
                style={{ minHeight: '44px' }}
              >
                <Sparkles className="w-3.5 h-3.5 text-yellow-600" /> Autofill
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-2 py-3.5 px-4 bg-[#ffd900] border border-yellow-500 hover:bg-[#ffe54c] text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-yellow-100/50 uppercase tracking-wide font-outfit"
                style={{ minHeight: '44px' }}
              >
                {loading ? 'Processing...' : (isSignUp ? 'Register' : 'Access Portal')} 
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

        </motion.div>
      </main>

      {/* Bottom Legal Notice */}
      <footer className="relative z-10 text-center py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        🔐 Authenticated securely via Supabase cryptographic protocols.
      </footer>
    </div>
  );
}

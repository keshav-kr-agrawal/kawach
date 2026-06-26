import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, User, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export default function CitizenLoginView({ onLoginSuccess, onBackToHome }) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (username.trim() && pin.trim()) {
        onLoginSuccess();
      } else {
        setError('Please enter a username and security PIN.');
        setLoading(false);
      }
    }, 800);
  };

  const handleAutofill = () => {
    setUsername('citizen_user');
    setPin('123456');
    setError('');
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
            <h2 className="text-2xl font-black text-slate-900 font-outfit">Citizen Access</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
              Sentinel Decoupled Intranet
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Citizen Username
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter citizen username..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white font-semibold shadow-2xs transition-all"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold mt-1.5 px-1">
                Mock account: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">citizen_user</code>
              </p>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                Security PIN
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type="password" 
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter security PIN..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-yellow-400 focus:bg-white font-semibold shadow-2xs transition-all"
                  style={{ minHeight: '44px' }}
                  required
                />
              </div>
              <p className="text-[9px] text-slate-400 font-bold mt-1.5 px-1">
                Mock passcode: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">123456</code>
              </p>
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
                className="flex-1 py-3.5 px-4 bg-[#ffd900] border border-yellow-500 hover:bg-[#ffe54c] text-slate-950 font-black rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-yellow-100/50 uppercase tracking-wide font-outfit"
                style={{ minHeight: '44px' }}
              >
                {loading ? 'Authenticating...' : 'Access Portal'} <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

        </motion.div>
      </main>

      {/* Bottom Legal Notice */}
      <footer className="relative z-10 text-center py-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
        🔐 All data traffic is hashed on-device using rotary sha-256 protocols.
      </footer>
    </div>
  );
}

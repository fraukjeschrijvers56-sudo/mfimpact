'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        router.push('/');
      } else {
        setError('Onjuist wachtwoord');
      }
    } catch (err) {
      setError('Er ging iets mis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatedBackground />
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8 space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="flex justify-center mb-4"
            >
              <img 
                src="/logo-full-white.png" 
                alt="MF Impact" 
                className="h-20 w-auto"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h1 className="text-3xl font-bold text-white mb-2">MVO-bewijs werkbank</h1>
              <p className="text-teal-200 text-lg">ESG-bewijs voor het Nederlandse MKB</p>
            </motion.div>
          </div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-teal-100 mb-2">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent backdrop-blur-sm transition-all"
                  placeholder="Voer uw wachtwoord in"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/30 backdrop-blur-sm"
                >
                  <p className="text-rose-200 text-sm font-medium">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full backdrop-blur-xl bg-teal-500/90 hover:bg-teal-600 disabled:bg-teal-500/50 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-teal-500/50 transition-all border border-teal-400/30 disabled:cursor-not-allowed"
              >
                {loading ? 'Bezig met inloggen...' : 'Inloggen'}
              </button>
            </form>
          </motion.div>

          {/* Footer note */}
          <p className="mt-6 text-center text-sm text-teal-200/60">
            Interne werkbank voor MVO-dienstverlening
          </p>
        </motion.div>
      </div>
    </>
  );
}

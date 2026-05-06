import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { login } from '../api/endpoints';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      localStorage.setItem('token', data.access_token);
      // Try to decode JWT to get doctor name (basic decode)
      try {
        const payload = JSON.parse(atob(data.access_token.split('.')[1]));
        if (payload.nom) localStorage.setItem('medecin_nom', payload.nom);
        if (payload.prenom) localStorage.setItem('medecin_prenom', payload.prenom);
      } catch {
        // fallback — store email as name
        localStorage.setItem('medecin_nom', email.split('@')[0]);
      }
      localStorage.setItem('medecin_nom', data.medecin.nom);
      localStorage.setItem('medecin_prenom', data.medecin.prenom);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-[40%] flex-col items-center justify-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0C447C 0%, #0a1628 100%)' }}
      >
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />

        <div className="relative z-10 text-center px-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <span className="text-4xl font-bold text-white tracking-tight">PrediCare</span>
          </div>

          <p className="text-blue-200 text-lg mb-10 leading-relaxed max-w-sm">
            Plateforme d'aide à la détection précoce du diabète de type 2
          </p>

          {/* ECG Line Animation */}
          <div className="mb-8">
            <svg viewBox="0 0 400 80" className="w-full max-w-sm mx-auto opacity-40">
              <polyline
                fill="none"
                stroke="#60A5FA"
                strokeWidth="2"
                points="0,40 40,40 60,40 70,15 80,65 90,30 100,45 110,40 200,40 220,40 230,15 240,65 250,30 260,45 270,40 400,40"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="800"
                  to="0"
                  dur="3s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="stroke-dasharray"
                  values="0,800;400,400;800,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </polyline>
            </svg>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 border border-green-400/30">
            <span className="text-green-300 text-sm font-medium">AUC-ROC 0.87 ✓</span>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Activity className="w-7 h-7 text-primary" />
            <span className="text-2xl font-bold text-primary">PrediCare</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Connexion médecin</h1>
          <p className="text-gray-500 mb-8">Accédez à votre espace de prédiction</p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="docteur@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-12 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

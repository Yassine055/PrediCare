import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  LogOut,
  Activity,
  UserCircle,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/analyze', icon: Stethoscope, label: 'Analyser' },
  { to: '/patients', icon: Users, label: 'Patients' },
  { to: '/reports', icon: FileText, label: 'Rapports' },
  { to: '/profile', icon: UserCircle, label: 'Profil' },
];

const Sidebar = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const nom = localStorage.getItem('medecin_nom') || '';
  const prenom = localStorage.getItem('medecin_prenom') || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('medecin_nom');
    localStorage.removeItem('medecin_prenom');
    navigate('/login');
  };

  const close = () => setIsOpen(false);

  return (
    <>
      {/* Bouton hamburger — visible uniquement sur mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-white shadow-md"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Fond semi-transparent — ferme la sidebar au clic en dehors */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar principale */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-[220px] bg-primary flex flex-col z-50
          transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Bouton fermer — mobile uniquement */}
        <button
          onClick={close}
          className="lg:hidden absolute top-4 right-3 text-white/70 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-6">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">PrediCare</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={close}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Déconnexion + infos médecin */}
        <div className="px-3 pb-5 space-y-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-200 w-full"
          >
            <LogOut className="w-[18px] h-[18px]" />
            Déconnexion
          </button>
          <button
            onClick={() => { navigate('/profile'); close(); }}
            className="border-t border-white/10 pt-3 px-3 w-full text-left rounded-lg hover:bg-white/10 transition-colors"
          >
            {/* capitalize : première lettre de chaque mot en majuscule */}
            <p className="text-white text-sm font-semibold truncate capitalize">
              Dr. {prenom} {nom}
            </p>
            <p className="text-blue-300 text-xs">Médecin</p>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

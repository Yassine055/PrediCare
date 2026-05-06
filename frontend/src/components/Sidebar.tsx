import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  LogOut,
  Activity,
  UserCircle,
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
  const nom = localStorage.getItem('medecin_nom') || '';
  const prenom = localStorage.getItem('medecin_prenom') || '';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('medecin_nom');
    localStorage.removeItem('medecin_prenom');
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-primary flex flex-col z-50">
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

      {/* Logout & Doctor info */}
      <div className="px-3 pb-5 space-y-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-blue-200 hover:bg-white/10 hover:text-white transition-all duration-200 w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Déconnexion
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="border-t border-white/10 pt-3 px-3 w-full text-left rounded-lg hover:bg-white/10 transition-colors"
        >
          <p className="text-white text-sm font-semibold truncate">
            Dr. {prenom} {nom}
          </p>
          <p className="text-blue-300 text-xs">Médecin</p>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

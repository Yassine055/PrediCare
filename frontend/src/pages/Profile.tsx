import { FormEvent, useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { changePassword, getProfile, updateProfile } from '../api/endpoints';
import { Medecin, MedecinUpdate, PasswordChange } from '../types';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle,
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  User,
} from 'lucide-react';

const Profile = () => {
  const [profile, setProfile] = useState<Medecin | null>(null);
  const [profileForm, setProfileForm] = useState<MedecinUpdate>({
    nom: '',
    prenom: '',
    email: '',
  });
  const [passwordForm, setPasswordForm] = useState<PasswordChange & { confirm_password: string }>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getProfile();
        setProfile(data);
        setProfileForm({
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
        });
      } catch {
        setError('Impossible de charger le profil.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    setError('');

    try {
      const data = await updateProfile(profileForm);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('medecin_nom', data.medecin.nom);
      localStorage.setItem('medecin_prenom', data.medecin.prenom);

      const refreshedProfile = await getProfile();
      setProfile(refreshedProfile);
      setProfileMessage('Profil mis à jour avec succès.');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Cet email est déjà utilisé par un autre compte.');
      } else {
        setError('Erreur lors de la mise à jour du profil.');
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordMessage('');
    setError('');

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      setSavingPassword(false);
      return;
    }

    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setPasswordMessage('Mot de passe mis à jour avec succès.');
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError('Mot de passe actuel incorrect.');
      } else {
        setError('Erreur lors du changement de mot de passe.');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-[220px] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Profil médecin</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gérez vos informations de compte et votre mot de passe.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Dr. {profile?.prenom} {profile?.nom}
              </h2>
              <p className="text-sm text-gray-500 mt-1">{profile?.email}</p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  Compte créé le {createdAt}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-risk-low" />
                  {profile?.is_active ? 'Compte actif' : 'Compte désactivé'}
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <User className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Informations personnelles</h2>
              </div>

              {profileMessage && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {profileMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={profileForm.nom}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, nom: event.target.value }))}
                    required
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={profileForm.prenom}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, prenom: event.target.value }))}
                    required
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors disabled:opacity-60"
              >
                {savingProfile ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer le profil
              </button>
            </form>

            <form onSubmit={handlePasswordSubmit} className="lg:col-span-3 bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <KeyRound className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-gray-900">Changer le mot de passe</h2>
              </div>

              {passwordMessage && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {passwordMessage}
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4 mb-5">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Mot de passe actuel</label>
                  <input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, current_password: event.target.value }))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Confirmation</label>
                  <input
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_password: event.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light transition-colors disabled:opacity-60"
              >
                {savingPassword ? (
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                Mettre à jour le mot de passe
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Profile;

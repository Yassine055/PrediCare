import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Sidebar from '../components/Sidebar';
import { downloadPDF, getPatientScores, getPatients } from '../api/endpoints';
import { Patient, Score } from '../types';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle,
  Download,
  Eye,
  FileText,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';

const riskColors = {
  faible: '#27500A',
  modere: '#633806',
  eleve: '#791F1F',
  neutral: '#0C447C',
};

const normalizeNiveau = (niveau?: string) => {
  switch (niveau?.toLowerCase()) {
    case 'eleve':
    case 'élevé':
      return 'eleve';
    case 'modere':
    case 'modéré':
      return 'modere';
    case 'faible':
      return 'faible';
    default:
      return 'none';
  }
};

const formatShortDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });
};

/* Première lettre de chaque mot en majuscule */
const cap = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

const Dashboard = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const nom = localStorage.getItem('medecin_nom') || '';
  const prenom = localStorage.getItem('medecin_prenom') || '';

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const patientData = await getPatients();
        setPatients(patientData);

        const histories = await Promise.all(
          patientData.map(async (patient) => {
            try {
              return await getPatientScores(patient.id);
            } catch (error) {
              console.error(`Erreur chargement scores patient #${patient.id}:`, error);
              return [] as Score[];
            }
          })
        );
        setScores(histories.flat());
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const stats = useMemo(() => {
    const analyzedPatients = patients.filter((patient) => patient.last_score != null);
    const scoreTotal = analyzedPatients.reduce(
      (sum, patient) => sum + (patient.last_score ?? 0),
      0
    );

    return {
      total: patients.length,
      analyses: scores.length,
      eleve: patients.filter((patient) => normalizeNiveau(patient.last_niveau) === 'eleve').length,
      modere: patients.filter((patient) => normalizeNiveau(patient.last_niveau) === 'modere').length,
      faible: patients.filter((patient) => normalizeNiveau(patient.last_niveau) === 'faible').length,
      sansAnalyse: patients.filter((patient) => patient.last_score == null).length,
      scoreMoyen: analyzedPatients.length ? scoreTotal / analyzedPatients.length : 0,
    };
  }, [patients, scores]);

  const riskData = useMemo(
    () => [
      { name: 'Faible', value: stats.faible, color: riskColors.faible },
      { name: 'Modéré', value: stats.modere, color: riskColors.modere },
      { name: 'Élevé', value: stats.eleve, color: riskColors.eleve },
      { name: 'Sans analyse', value: stats.sansAnalyse, color: '#9CA3AF' },
    ],
    [stats]
  );

  const evolutionData = useMemo(() => {
    const grouped = scores.reduce<
      Record<string, { dateKey: string; date: string; analyses: number; totalScore: number }>
    >((acc, score) => {
      const date = new Date(score.created_at);
      const dateKey = date.toISOString().slice(0, 10);

      if (!acc[dateKey]) {
        acc[dateKey] = {
          dateKey,
          date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          analyses: 0,
          totalScore: 0,
        };
      }

      acc[dateKey].analyses += 1;
      acc[dateKey].totalScore += score.score;
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-8)
      .map((item) => ({
        ...item,
        scoreMoyen: Number((item.totalScore / item.analyses).toFixed(1)),
      }));
  }, [scores]);

  const watchPatients = useMemo(
    () =>
      [...patients]
        .filter((patient) => (patient.last_score ?? 0) >= 61 || normalizeNiveau(patient.last_niveau) === 'eleve')
        .sort((a, b) => (b.last_score ?? 0) - (a.last_score ?? 0))
        .slice(0, 5),
    [patients]
  );

  const sortedPatients = useMemo(
    () => [...patients].sort((a, b) => (b.last_score || 0) - (a.last_score || 0)),
    [patients]
  );

  const recentScores = useMemo(
    () =>
      [...patients]
        .filter((patient) => patient.last_score_date)
        .sort(
          (a, b) =>
            new Date(b.last_score_date || '').getTime() -
            new Date(a.last_score_date || '').getTime()
        )
        .slice(0, 4),
    [patients]
  );

  const getNiveauBadge = (niveau?: string) => {
    switch (normalizeNiveau(niveau)) {
      case 'eleve':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-highBg text-risk-high">Élevé</span>;
      case 'modere':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-midBg text-risk-mid">Modéré</span>;
      case 'faible':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-lowBg text-risk-low">Faible</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">—</span>;
    }
  };

  const handleDownloadPDF = async (id: number) => {
    try {
      await downloadPDF(id);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      {/* pt-16 sur mobile pour laisser la place au bouton hamburger */}
      <main className="ml-0 lg:ml-[220px] p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Bonjour Dr. {cap(prenom)} {cap(nom)}
            </h1>
            <p className="text-gray-500 text-sm mt-1 capitalize">{today}</p>
          </div>
          <button
            id="new-patient-btn"
            onClick={() => navigate('/analyze')}
            className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors duration-200 text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau patient</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </div>

        {/* Stat cards — 2 colonnes sur mobile, 4 sur desktop */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total patients', value: stats.total, icon: Users, color: riskColors.neutral, bg: '#E6F1FB' },
            { label: 'Analyses', value: stats.analyses, icon: FileText, color: riskColors.neutral, bg: '#E6F1FB' },
            { label: 'Score moyen', value: stats.scoreMoyen ? stats.scoreMoyen.toFixed(1) : '—', icon: TrendingUp, color: '#633806', bg: '#FAEEDA' },
            { label: 'À surveiller', value: watchPatients.length, icon: AlertTriangle, color: riskColors.eleve, bg: '#FCEBEB' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: stat.bg }}>
                <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: stat.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Évolution des analyses</h2>
                <p className="text-sm text-gray-500">Dernières dates avec analyses sauvegardées</p>
              </div>
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>

            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : evolutionData.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                <Activity className="w-10 h-10 mb-2 opacity-40" />
                <p className="font-medium">Aucune analyse enregistrée</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={evolutionData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#6B7280' }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="analyses" name="Analyses" stroke="#0C447C" strokeWidth={3} dot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="scoreMoyen" name="Score moyen" stroke="#791F1F" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Répartition des risques</h2>
                <p className="text-sm text-gray-500">Selon le dernier score patient</p>
              </div>
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>

            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : patients.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-gray-400">
                <Users className="w-10 h-10 mb-2 opacity-40" />
                <p className="font-medium">Aucun patient</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={riskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="value" name="Patients" radius={[6, 6, 0, 0]}>
                    {riskData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Patients à surveiller</h2>
              <AlertTriangle className="w-5 h-5 text-risk-high" />
            </div>
            {watchPatients.length === 0 ? (
              <div className="py-12 px-6 text-center text-gray-400">
                <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium">Aucun risque élevé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {watchPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm capitalize">
                        {patient.prenom} {patient.nom}
                      </p>
                      <p className="text-xs text-gray-400">
                        Dernière analyse: {formatShortDate(patient.last_score_date)}
                      </p>
                    </div>
                    <span className="text-risk-high font-bold text-sm">
                      {patient.last_score?.toFixed(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="xl:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Patients récents</h2>
              <button
                onClick={() => navigate('/patients')}
                className="text-primary text-sm font-medium hover:underline"
              >
                Voir tous
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : patients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Activity className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-gray-500 font-medium">Aucun patient enregistré</p>
                <p className="text-gray-400 text-sm">Commencez par analyser un nouveau patient</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3">Patient</th>
                      {/* Colonnes secondaires masquées sur petit écran */}
                      <th className="px-6 py-3 hidden sm:table-cell">Âge</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Niveau</th>
                      <th className="px-6 py-3 hidden md:table-cell">Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedPatients.slice(0, 8).map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                              <span className="text-primary text-sm font-semibold uppercase">
                                {patient.prenom?.[0]}{patient.nom?.[0]}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 text-sm capitalize">
                              {patient.prenom} {patient.nom}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 hidden sm:table-cell">{patient.age} ans</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-sm text-gray-900">
                            {patient.last_score?.toFixed(1) ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getNiveauBadge(patient.last_niveau)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                          {formatShortDate(patient.last_score_date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => navigate(`/patients/${patient.id}`)}
                              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all duration-200"
                              title="Voir"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(patient.id)}
                              className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all duration-200"
                              title="Télécharger PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {recentScores.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Dernières analyses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {recentScores.map((patient) => (
                <button
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="rounded-xl border border-gray-100 p-4 text-left hover:border-primary/30 hover:bg-primary-light/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-900 text-sm truncate capitalize">
                      {patient.prenom} {patient.nom}
                    </p>
                    {getNiveauBadge(patient.last_niveau)}
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {patient.last_score?.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatShortDate(patient.last_score_date)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

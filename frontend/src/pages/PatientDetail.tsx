import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ScoreCard from '../components/ScoreCard';
import ShapChart from '../components/ShapChart';
import MedicalInsights from '../components/MedicalInsights';
import { downloadPDF, getPatient, getPatientScores } from '../api/endpoints';
import { Patient, Score } from '../types';
import { downloadCsv } from '../utils/exportCsv';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  FileDown,
  FileText,
  HeartPulse,
  Pencil,
  Stethoscope,
  User,
} from 'lucide-react';

const buildMessage = (niveau: string, score: number) => {
  switch (niveau.toLowerCase()) {
    case 'eleve':
    case 'élevé':
      return `Risque élevé de diabète de type 2 (score ${score.toFixed(0)}/100). Une consultation spécialisée et des examens complémentaires sont fortement conseillés.`;
    case 'modere':
    case 'modéré':
      return `Risque modéré de diabète de type 2 (score ${score.toFixed(0)}/100). Un suivi régulier et des ajustements du mode de vie sont recommandés.`;
    default:
      return `Risque faible de diabète de type 2 (score ${score.toFixed(0)}/100). Aucune intervention urgente requise. Maintenir un mode de vie sain.`;
  }
};

const getNiveauBadge = (niveau?: string) => {
  switch (niveau?.toLowerCase()) {
    case 'eleve':
    case 'élevé':
      return 'bg-risk-highBg text-risk-high';
    case 'modere':
    case 'modéré':
      return 'bg-risk-midBg text-risk-mid';
    case 'faible':
      return 'bg-risk-lowBg text-risk-low';
    default:
      return 'bg-gray-100 text-gray-500';
  }
};

const getNiveauLabel = (niveau?: string) => {
  switch (niveau?.toLowerCase()) {
    case 'eleve':
    case 'élevé':
      return 'Élevé';
    case 'modere':
    case 'modéré':
      return 'Modéré';
    case 'faible':
      return 'Faible';
    default:
      return 'Non analysé';
  }
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PatientDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = Number(id);
    if (!id || Number.isNaN(patientId)) {
      setError('Patient introuvable.');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      setError('');
      try {
        const [patientData, scoreData] = await Promise.all([
          getPatient(patientId),
          getPatientScores(patientId),
        ]);
        setPatient(patientData);
        setScores(scoreData);
      } catch {
        setError('Impossible de charger la fiche patient.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  const latestScore = useMemo(() => scores[0] ?? null, [scores]);

  const patientForAnalysis = useMemo(() => {
    if (!patient) return null;
    if (!latestScore) return patient;
    return {
      ...patient,
      last_score: latestScore.score,
      last_niveau: latestScore.niveau,
      last_score_date: latestScore.created_at,
    };
  }, [patient, latestScore]);

  const handleAnalyze = () => {
    if (!patientForAnalysis) return;
    navigate('/analyze', { state: { patient: patientForAnalysis } });
  };

  const handlePDF = async () => {
    if (!patient || !latestScore) return;
    setDownloading(true);
    try {
      await downloadPDF(patient.id);
    } catch {
      setError('Impossible de télécharger le rapport PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleExportHistory = () => {
    if (!patient || scores.length === 0) return;

    const rows = scores.map((score) => {
      const shapEntries = Object.entries(score.shap_values || {})
        .sort((a, b) => Math.abs(Number(b[1])) - Math.abs(Number(a[1])))
        .slice(0, 3);

      return {
        Patient_ID: patient.id,
        Patient: `${patient.prenom} ${patient.nom}`,
        Date_analyse: formatDateTime(score.created_at),
        Score: score.score,
        Niveau: getNiveauLabel(score.niveau),
        Probabilite: `${(score.probabilite * 100).toFixed(1)}%`,
        Facteur_1: shapEntries[0]?.[0] ?? '',
        Impact_1: shapEntries[0]?.[1] ?? '',
        Facteur_2: shapEntries[1]?.[0] ?? '',
        Impact_2: shapEntries[1]?.[1] ?? '',
        Facteur_3: shapEntries[2]?.[0] ?? '',
        Impact_3: shapEntries[2]?.[1] ?? '',
      };
    });

    downloadCsv(`predicare_historique_patient_${patient.id}.csv`, rows);
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-[220px] p-8">
        <button
          onClick={() => navigate('/patients')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux patients
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : error && !patient ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <AlertCircle className="w-10 h-10 text-risk-high mx-auto mb-3" />
            <p className="font-semibold text-gray-900">{error}</p>
          </div>
        ) : patient ? (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.prenom} {patient.nom}
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Fiche patient et historique des analyses
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(`/patients/${patient.id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors"
                >
                  <Stethoscope className="w-4 h-4" />
                  Relancer l'analyse
                </button>
                <button
                  onClick={handlePDF}
                  disabled={!latestScore || downloading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {downloading ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF
                </button>
                <button
                  onClick={handleExportHistory}
                  disabled={scores.length === 0}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Âge</p>
                  <p className="font-bold text-gray-900">{patient.age} ans</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center">
                  <HeartPulse className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">IMC</p>
                  <p className="font-bold text-gray-900">{patient.imc}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dernier score</p>
                  <p className="font-bold text-gray-900">
                    {latestScore ? `${latestScore.score.toFixed(1)} / 100` : '—'}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Analyses</p>
                  <p className="font-bold text-gray-900">{scores.length}</p>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Données cliniques</h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Glycémie à jeun', patient.glycemie_jeun],
                    ['HbA1c', `${patient.hba1c} %`],
                    ['Tension systolique', `${patient.tension_systolique} mmHg`],
                    ['Tension diastolique', `${patient.tension_diastolique} mmHg`],
                    ['HDL', patient.hdl],
                    ['LDL', patient.ldl],
                    ['Créatinine', patient.creatinine],
                    ['Tabac', patient.tabac === 1 ? 'Oui' : 'Non'],
                    ['Antécédents familiaux', patient.antecedents_familiaux === 1 ? 'Oui' : 'Non'],
                    ['Créé le', formatDate(patient.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-gray-50 px-4 py-3">
                      <p className="text-xs text-gray-400 mb-1">{label}</p>
                      <p className="font-semibold text-gray-800">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {latestScore ? (
                <ScoreCard
                  score={latestScore.score}
                  niveau={latestScore.niveau}
                  probabilite={latestScore.probabilite}
                  message={buildMessage(latestScore.niveau, latestScore.score)}
                />
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-10 flex flex-col items-center justify-center text-center">
                  <Activity className="w-12 h-12 text-gray-300 mb-3" />
                  <h2 className="font-semibold text-gray-500 mb-1">Aucune analyse</h2>
                  <p className="text-sm text-gray-400 mb-5">
                    Relancez une analyse pour créer le premier score de ce patient.
                  </p>
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors"
                  >
                    <Stethoscope className="w-4 h-4" />
                    Analyser maintenant
                  </button>
                </div>
              )}
            </div>

            {latestScore?.shap_values && (
              <div className="space-y-6 mb-6">
                <ShapChart shap_values={latestScore.shap_values} />
                <MedicalInsights
                  score={latestScore.score}
                  niveau={latestScore.niveau}
                  shap_values={latestScore.shap_values}
                />
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-gray-900">Historique des analyses</h2>
              </div>

              {scores.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">Aucun score enregistré</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Score</th>
                        <th className="px-6 py-3">Probabilité</th>
                        <th className="px-6 py-3">Niveau</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {scores.map((score) => (
                        <tr key={score.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatDateTime(score.created_at)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                            {score.score.toFixed(1)} / 100
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {(score.probabilite * 100).toFixed(1)} %
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getNiveauBadge(score.niveau)}`}>
                              {getNiveauLabel(score.niveau)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default PatientDetail;

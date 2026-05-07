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

/* ── Helpers texte ────────────────────────────────────────────────────────── */

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

const getNiveauBadgeCls = (niveau?: string) => {
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

/* ── Badge pour chaque paramètre clinique ─────────────────────────────────── */

type BadgeInfo = { label: string; cls: string } | null;

const getClinicalBadge = (field: string, value: number): BadgeInfo => {
  switch (field) {
    case 'glycemie_jeun':
      if (value < 5.6) return { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' };
      if (value <= 6.1) return { label: 'LIMITE', cls: 'bg-risk-midBg text-risk-mid' };
      return { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    case 'hba1c':
      if (value < 5.7) return { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' };
      if (value <= 6.5) return { label: 'LIMITE', cls: 'bg-risk-midBg text-risk-mid' };
      return { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    case 'tension_systolique':
      return value < 130
        ? { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' }
        : { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    case 'tension_diastolique':
      return value < 85
        ? { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' }
        : { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    case 'hdl':
      return value >= 1.0
        ? { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' }
        : { label: 'BAS', cls: 'bg-risk-midBg text-risk-mid' };
    case 'ldl':
      return value < 3.4
        ? { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' }
        : { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    case 'creatinine':
      return value >= 60 && value <= 110
        ? { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' }
        : { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
    default:
      return null;
  }
};

/* ── Composant principal ──────────────────────────────────────────────────── */

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
      last_score      : latestScore.score,
      last_niveau     : latestScore.niveau,
      last_score_date : latestScore.created_at,
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
        Patient_ID : patient.id,
        Patient    : `${patient.prenom} ${patient.nom}`,
        Date_analyse: formatDateTime(score.created_at),
        Score       : score.score,
        Niveau      : getNiveauLabel(score.niveau),
        Probabilite : `${(score.probabilite * 100).toFixed(1)}%`,
        Facteur_1   : shapEntries[0]?.[0] ?? '',
        Impact_1    : shapEntries[0]?.[1] ?? '',
        Facteur_2   : shapEntries[1]?.[0] ?? '',
        Impact_2    : shapEntries[1]?.[1] ?? '',
        Facteur_3   : shapEntries[2]?.[0] ?? '',
        Impact_3    : shapEntries[2]?.[1] ?? '',
      };
    });

    downloadCsv(`predicare_historique_patient_${patient.id}.csv`, rows);
  };

  /* ── Rendu ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      {/* pt-16 sur mobile pour le bouton hamburger */}
      <main className="ml-0 lg:ml-[220px] p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">

        {/* Retour */}
        <button
          onClick={() => navigate('/patients')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux patients
        </button>

        {/* ── Chargement ── */}
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

            {/* ── En-tête ── */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize mb-1">
                {patient.prenom} {patient.nom}
              </h1>
              <p className="text-gray-500 text-sm mb-4">
                Fiche patient et historique des analyses
              </p>

              {/* Boutons d'action — scrollables horizontalement sur mobile */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => navigate(`/patients/${patient.id}/edit`)}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-blue-700 text-blue-700 font-semibold text-sm whitespace-nowrap hover:bg-blue-50 transition-colors shrink-0"
                >
                  <Pencil className="w-4 h-4" />
                  Modifier
                </button>
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-primary text-white font-semibold text-sm whitespace-nowrap hover:bg-primary-medium transition-colors shrink-0"
                >
                  <Stethoscope className="w-4 h-4" />
                  Relancer
                </button>
                <button
                  onClick={handlePDF}
                  disabled={!latestScore || downloading}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm whitespace-nowrap hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {downloading ? (
                    <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-500 rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  PDF
                </button>
                <button
                  onClick={handleExportHistory}
                  disabled={scores.length === 0}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm whitespace-nowrap hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* ── 4 stats cards : 2x2 mobile → 4x1 desktop ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {/* Âge */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center mb-2">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-gray-400 mb-0.5">Âge</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{patient.age}</p>
                <p className="text-xs text-gray-400 mt-0.5">ans</p>
              </div>

              {/* IMC */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center mb-2">
                  <HeartPulse className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-gray-400 mb-0.5">IMC</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{patient.imc}</p>
                <p className="text-xs text-gray-400 mt-0.5">kg/m²</p>
              </div>

              {/* Dernier score */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-gray-400 mb-0.5">Dernier score</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">
                  {latestScore ? latestScore.score.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">/100</p>
              </div>

              {/* Analyses */}
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="w-9 h-9 rounded-lg bg-primary-light flex items-center justify-center mb-2">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-gray-400 mb-0.5">Analyses</p>
                <p className="text-2xl font-bold text-gray-900 leading-none">{scores.length}</p>
                <p className="text-xs text-gray-400 mt-0.5">au total</p>
              </div>
            </div>

            {/* ── Données cliniques + Score ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Données cliniques avec badges de statut */}
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-base font-bold text-gray-900 mb-4">Données cliniques</h2>
                <div className="grid grid-cols-2 gap-3">

                  {/* Glycémie à jeun */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Glycémie à jeun</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.glycemie_jeun} mmol/L</p>
                    {(() => {
                      const b = getClinicalBadge('glycemie_jeun', patient.glycemie_jeun);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* HbA1c */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">HbA1c</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.hba1c} %</p>
                    {(() => {
                      const b = getClinicalBadge('hba1c', patient.hba1c);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* Tension systolique */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Tension systol.</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.tension_systolique} mmHg</p>
                    {(() => {
                      const b = getClinicalBadge('tension_systolique', patient.tension_systolique);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* Tension diastolique */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Tension diast.</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.tension_diastolique} mmHg</p>
                    {(() => {
                      const b = getClinicalBadge('tension_diastolique', patient.tension_diastolique);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* HDL */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">HDL cholestérol</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.hdl} mmol/L</p>
                    {(() => {
                      const b = getClinicalBadge('hdl', patient.hdl);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* LDL */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">LDL cholestérol</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.ldl} mmol/L</p>
                    {(() => {
                      const b = getClinicalBadge('ldl', patient.ldl);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* Créatinine */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Créatinine</p>
                    <p className="font-bold text-gray-900 text-sm">{patient.creatinine} µmol/L</p>
                    {(() => {
                      const b = getClinicalBadge('creatinine', patient.creatinine);
                      return b ? <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${b.cls}`}>{b.label}</span> : null;
                    })()}
                  </div>

                  {/* Tabac */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Tabagisme</p>
                    <p className="font-bold text-gray-900 text-sm">
                      {patient.tabac === 1 ? 'Oui' : 'Non'}
                    </p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                      patient.tabac === 1 ? 'bg-risk-midBg text-risk-mid' : 'bg-risk-lowBg text-risk-low'
                    }`}>
                      {patient.tabac === 1 ? 'FACTEUR' : 'ABSENT'}
                    </span>
                  </div>

                  {/* Antécédents familiaux */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Antécédents fam.</p>
                    <p className="font-bold text-gray-900 text-sm">
                      {patient.antecedents_familiaux === 1 ? 'Oui' : 'Non'}
                    </p>
                    <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-semibold ${
                      patient.antecedents_familiaux === 1 ? 'bg-risk-midBg text-risk-mid' : 'bg-risk-lowBg text-risk-low'
                    }`}>
                      {patient.antecedents_familiaux === 1 ? 'FACTEUR' : 'ABSENT'}
                    </span>
                  </div>

                  {/* Date de création */}
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-1">Créé le</p>
                    <p className="font-bold text-gray-900 text-sm">{formatDate(patient.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Score de risque (ScoreCard existant) */}
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

            {/* ── SHAP + Insights ── */}
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

            {/* ── Historique des analyses ── */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-gray-900">Historique des analyses</h2>
              </div>

              {scores.length === 0 ? (
                <div className="py-14 text-center text-gray-400">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">Aucune analyse précédente</p>
                </div>
              ) : (
                <>
                  {/* Cards — mobile uniquement */}
                  <div className="sm:hidden divide-y divide-gray-50">
                    {scores.map((score) => (
                      <div key={score.id} className="px-4 py-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold text-gray-900">
                            {score.score.toFixed(1)} <span className="text-xs font-normal text-gray-400">/ 100</span>
                          </p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getNiveauBadgeCls(score.niveau)}`}>
                            {getNiveauLabel(score.niveau)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(score.created_at)} · {(score.probabilite * 100).toFixed(1)} %
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Tableau — desktop */}
                  <div className="hidden sm:block overflow-x-auto">
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
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getNiveauBadgeCls(score.niveau)}`}>
                                {getNiveauLabel(score.niveau)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
};

export default PatientDetail;

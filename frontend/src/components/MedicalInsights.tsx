import {
  Activity,
  AlertTriangle,
  CheckCircle,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { ShapValues } from '../types';

interface MedicalInsightsProps {
  niveau: string;
  score: number;
  shap_values: ShapValues;
}

const labelMap: Record<string, string> = {
  age: 'Âge',
  imc: 'IMC',
  glycemie_jeun: 'Glycémie à jeun',
  hba1c: 'HbA1c',
  tension_systolique: 'Tension systolique',
  tension_diastolique: 'Tension diastolique',
  hdl: 'HDL cholestérol',
  ldl: 'LDL cholestérol',
  creatinine: 'Créatinine',
  tabac: 'Tabagisme',
  antecedents_familiaux: 'Antécédents familiaux',
};

const normalizeNiveau = (niveau: string) => {
  switch (niveau.toLowerCase()) {
    case 'eleve':
    case 'élevé':
      return 'eleve';
    case 'modere':
    case 'modéré':
      return 'modere';
    default:
      return 'faible';
  }
};

const recommendations: Record<string, string[]> = {
  faible: [
    'Maintenir une alimentation équilibrée et limiter les sucres rapides.',
    'Encourager une activité physique régulière, au moins 30 minutes par jour.',
    'Réaliser un contrôle biologique annuel ou selon le contexte clinique.',
  ],
  modere: [
    'Programmer un suivi clinique et biologique rapproché.',
    'Renforcer les mesures hygiéno-diététiques: poids, alimentation, activité physique.',
    'Contrôler la glycémie et HbA1c dans les prochains mois.',
  ],
  eleve: [
    'Orienter vers une consultation spécialisée ou un avis endocrinologique.',
    'Demander des examens complémentaires selon le contexte clinique.',
    'Mettre en place une prise en charge active des facteurs de risque modifiables.',
  ],
};

const levelInfo = {
  faible: {
    title: 'Risque faible',
    icon: CheckCircle,
    color: '#27500A',
    bg: '#EAF3DE',
  },
  modere: {
    title: 'Risque modéré',
    icon: AlertTriangle,
    color: '#633806',
    bg: '#FAEEDA',
  },
  eleve: {
    title: 'Risque élevé',
    icon: Stethoscope,
    color: '#791F1F',
    bg: '#FCEBEB',
  },
};

const formatImpact = (value: number) => Math.abs(value).toFixed(4);

const MedicalInsights = ({ niveau, score, shap_values }: MedicalInsightsProps) => {
  const normalized = normalizeNiveau(niveau);
  const info = levelInfo[normalized];
  const LevelIcon = info.icon;

  const sortedFactors = Object.entries(shap_values)
    .map(([key, value]) => ({
      key,
      label: labelMap[key] || key,
      value,
      absValue: Math.abs(value),
    }))
    .sort((a, b) => b.absValue - a.absValue);

  const riskFactors = sortedFactors.filter((factor) => factor.value > 0).slice(0, 3);
  const protectiveFactors = sortedFactors.filter((factor) => factor.value < 0).slice(0, 2);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Interprétation médicale</h3>
          <p className="text-sm text-gray-500 mt-1">
            Synthèse des facteurs SHAP et recommandations cliniques.
          </p>
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: info.bg }}
        >
          <LevelIcon className="w-5 h-5" style={{ color: info.color }} />
        </div>
      </div>

      <div className="rounded-xl p-4 mb-5" style={{ backgroundColor: info.bg }}>
        <p className="text-sm font-semibold mb-1" style={{ color: info.color }}>
          {info.title} - score {score.toFixed(1)} / 100
        </p>
        <p className="text-sm leading-relaxed" style={{ color: info.color }}>
          Cette interprétation aide à identifier les facteurs qui pèsent le plus dans la
          prédiction. Elle complète l'avis médical, sans le remplacer.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-5">
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-risk-high" />
            <h4 className="text-sm font-semibold text-gray-900">Facteurs qui augmentent le risque</h4>
          </div>
          {riskFactors.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun facteur aggravant dominant détecté.</p>
          ) : (
            <ul className="space-y-2">
              {riskFactors.map((factor) => (
                <li key={factor.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-700">{factor.label}</span>
                  <span className="font-semibold text-risk-high">+{formatImpact(factor.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-green-100 bg-green-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-4 h-4 text-risk-low" />
            <h4 className="text-sm font-semibold text-gray-900">Facteurs protecteurs</h4>
          </div>
          {protectiveFactors.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun facteur protecteur dominant détecté.</p>
          ) : (
            <ul className="space-y-2">
              {protectiveFactors.map((factor) => (
                <li key={factor.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-700">{factor.label}</span>
                  <span className="font-semibold text-risk-low">-{formatImpact(factor.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <HeartPulse className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold text-gray-900">Recommandations</h4>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {recommendations[normalized].map((recommendation) => (
            <div key={recommendation} className="rounded-xl bg-gray-50 p-4 flex gap-3">
              <Activity className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-relaxed">{recommendation}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicalInsights;

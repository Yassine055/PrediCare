import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ScoreCard from '../components/ScoreCard';
import ShapChart from '../components/ShapChart';
import MedicalInsights from '../components/MedicalInsights';
import { predict, createPatient, createScore, downloadPDF } from '../api/endpoints';
import { Patient, PredictionResponse } from '../types';
import {
  User,
  Heart,
  Droplets,
  Activity,
  FlaskConical,
  Cigarette,
  Users,
  Microscope,
  Save,
  FileDown,
  CheckCircle,
} from 'lucide-react';

const defaultForm = {
  nom: '',
  prenom: '',
  age: 45,
  imc: 25,
  glycemie_jeun: 5.0,
  hba1c: 5.5,
  tension_systolique: 120,
  tension_diastolique: 80,
  hdl: 1.5,
  ldl: 3.0,
  creatinine: 80,
  tabac: 0,
  antecedents_familiaux: 0,
};

const Analyze = () => {
  const location = useLocation();

  const [form, setForm] = useState(defaultForm);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Patient existant transmis depuis la page /patients via navigate state
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  const [existingPatientId, setExistingPatientId] = useState<number | null>(null);

  // Pré-remplir le formulaire si un patient est passé en navigation state
  useEffect(() => {
    const p = location.state?.patient as Patient | undefined;
    if (!p) return;

    setForm({
      nom                  : p.nom,
      prenom               : p.prenom,
      age                  : p.age,
      imc                  : p.imc,
      glycemie_jeun        : p.glycemie_jeun,
      hba1c                : p.hba1c,
      tension_systolique   : p.tension_systolique,
      tension_diastolique  : p.tension_diastolique,
      hdl                  : p.hdl,
      ldl                  : p.ldl,
      creatinine           : p.creatinine,
      tabac                : p.tabac,
      antecedents_familiaux: p.antecedents_familiaux,
    });
    setExistingPatient(p);
    setExistingPatientId(p.id);
    setSavedId(p.id); // PDF disponible immédiatement pour ce patient
  }, [location.state]);

  const update = (field: string, value: number | string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSaved(false);
    // Ne pas effacer savedId pour un patient existant (PDF reste accessible)
    if (!existingPatientId) setSavedId(null);

    try {
      const { nom, prenom, ...predictData } = form;
      const result = await predict(predictData);
      setPrediction(result);
    } catch (err: any) {
      setError('Erreur lors de l\'analyse. Vérifiez les données saisies.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!prediction) return;
    setSaving(true);
    try {
      if (existingPatientId) {
        // Patient existant — sauvegarder uniquement le nouveau score
        await createScore({
          patient_id  : existingPatientId,
          score       : prediction.score,
          niveau      : prediction.niveau,
          probabilite : prediction.probabilite,
          shap_values : prediction.shap_values,
        });
      } else {
        // Nouveau patient — créer d'abord le dossier patient
        const patient = await createPatient(form);
        setSavedId(patient.id);
        await createScore({
          patient_id  : patient.id,
          score       : prediction.score,
          niveau      : prediction.niveau,
          probabilite : prediction.probabilite,
          shap_values : prediction.shap_values,
        });
      }
      setSaved(true);
    } catch (err) {
      setError('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  const handlePDF = async () => {
    if (!savedId) return;
    try {
      await downloadPDF(savedId);
    } catch (err) {
      setError('Erreur lors du téléchargement du PDF.');
    }
  };

  /* ── Badge helpers ── */
  const getIMCBadge = (imc: number) => {
    if (imc < 18.5) return { label: 'Sous-poids', cls: 'bg-gray-100 text-gray-600' };
    if (imc < 25) return { label: 'Normal', cls: 'bg-risk-lowBg text-risk-low' };
    if (imc < 30) return { label: 'Surpoids', cls: 'bg-risk-midBg text-risk-mid' };
    return { label: 'Obèse', cls: 'bg-risk-highBg text-risk-high' };
  };

  const getGlycemieBadge = (val: number) => {
    if (val < 5.6) return { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' };
    if (val <= 6.1) return { label: 'LIMITE', cls: 'bg-risk-midBg text-risk-mid' };
    return { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
  };

  const getHba1cBadge = (val: number) => {
    if (val < 5.7) return { label: 'NORMAL', cls: 'bg-risk-lowBg text-risk-low' };
    if (val <= 6.5) return { label: 'LIMITE', cls: 'bg-risk-midBg text-risk-mid' };
    return { label: 'ÉLEVÉ', cls: 'bg-risk-highBg text-risk-high' };
  };

  const imcBadge = getIMCBadge(form.imc);
  const glycBadge = getGlycemieBadge(form.glycemie_jeun);
  const hba1cBadge = getHba1cBadge(form.hba1c);

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-[220px] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {existingPatient
              ? `Analyser : ${existingPatient.prenom} ${existingPatient.nom}`
              : 'Analyse de risque'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {existingPatient
              ? 'Données pré-remplies — modifiez si nécessaire et relancez l\'analyse'
              : 'Saisissez les données cliniques pour obtenir une prédiction'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ── LEFT: Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* IDENTITÉ */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Identité du patient</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    id="analyze-nom"
                    type="text"
                    value={form.nom}
                    onChange={(e) => update('nom', e.target.value)}
                    placeholder="Nom"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    id="analyze-prenom"
                    type="text"
                    value={form.prenom}
                    onChange={(e) => update('prenom', e.target.value)}
                    placeholder="Prénom"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* DONNÉES PRINCIPALES */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Données principales</h2>
              </div>

              {/* Âge */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-600">Âge</label>
                  <span className="text-sm font-semibold text-primary">{form.age} ans</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="analyze-age-slider"
                    type="range"
                    min={18}
                    max={120}
                    value={form.age}
                    onChange={(e) => update('age', Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <input
                    id="analyze-age"
                    type="number"
                    min={18}
                    max={120}
                    value={form.age}
                    onChange={(e) => update('age', Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* IMC */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-600">IMC</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-primary">{form.imc}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${imcBadge.cls}`}>
                      {imcBadge.label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="analyze-imc-slider"
                    type="range"
                    min={10}
                    max={60}
                    step={0.1}
                    value={form.imc}
                    onChange={(e) => update('imc', Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <input
                    id="analyze-imc"
                    type="number"
                    min={10}
                    max={60}
                    step={0.1}
                    value={form.imc}
                    onChange={(e) => update('imc', Number(e.target.value))}
                    className="w-20 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* GLYCÉMIE */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Glycémie</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-600">Glycémie à jeun</label>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${glycBadge.cls}`}>
                      {glycBadge.label}
                    </span>
                  </div>
                  <input
                    id="analyze-glycemie"
                    type="number"
                    step={0.1}
                    value={form.glycemie_jeun}
                    onChange={(e) => update('glycemie_jeun', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-gray-600">HbA1c (%)</label>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${hba1cBadge.cls}`}>
                      {hba1cBadge.label}
                    </span>
                  </div>
                  <input
                    id="analyze-hba1c"
                    type="number"
                    step={0.1}
                    value={form.hba1c}
                    onChange={(e) => update('hba1c', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* TENSION */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Tension artérielle</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Systolique (mmHg)</label>
                  <input
                    id="analyze-tension-sys"
                    type="number"
                    value={form.tension_systolique}
                    onChange={(e) => update('tension_systolique', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Diastolique (mmHg)</label>
                  <input
                    id="analyze-tension-dia"
                    type="number"
                    value={form.tension_diastolique}
                    onChange={(e) => update('tension_diastolique', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* BILAN LIPIDIQUE */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Bilan lipidique</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">HDL (g/L)</label>
                  <input
                    id="analyze-hdl"
                    type="number"
                    step={0.01}
                    value={form.hdl}
                    onChange={(e) => update('hdl', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">LDL (g/L)</label>
                  <input
                    id="analyze-ldl"
                    type="number"
                    step={0.01}
                    value={form.ldl}
                    onChange={(e) => update('ldl', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Créatinine</label>
                  <input
                    id="analyze-creatinine"
                    type="number"
                    step={1}
                    value={form.creatinine}
                    onChange={(e) => update('creatinine', Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* FACTEURS DE RISQUE */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cigarette className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Facteurs de risque</h2>
              </div>
              <div className="space-y-4">
                {/* Tabac toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cigarette className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Tabagisme</span>
                  </div>
                  <button
                    id="analyze-tabac"
                    type="button"
                    onClick={() => update('tabac', form.tabac === 1 ? 0 : 1)}
                    className={`toggle-switch ${form.tabac === 1 ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span className={`toggle-switch-dot ${form.tabac === 1 ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Antécédents toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Antécédents familiaux</span>
                  </div>
                  <button
                    id="analyze-antecedents"
                    type="button"
                    onClick={() => update('antecedents_familiaux', form.antecedents_familiaux === 1 ? 0 : 1)}
                    className={`toggle-switch ${form.antecedents_familiaux === 1 ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span className={`toggle-switch-dot ${form.antecedents_familiaux === 1 ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              id="analyze-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Microscope className="w-5 h-5" />
                  Analyser le risque
                </>
              )}
            </button>
          </form>

          {/* ── RIGHT: Results ── */}
          <div className="space-y-5">
            {!prediction ? (
              existingPatient?.last_score != null ? (
                /* Dernier score connu du patient — avant nouvelle analyse */
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-700">Dernière analyse</span>
                    </div>
                    {existingPatient.last_score_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(existingPatient.last_score_date).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>

                  {/* Score + Niveau */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full border-4 border-primary flex items-center justify-center shrink-0">
                      <span className="text-2xl font-bold text-primary">
                        {existingPatient.last_score?.toFixed(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Score de risque / 100</p>
                      {existingPatient.last_niveau && (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          existingPatient.last_niveau === 'eleve'
                            ? 'bg-risk-highBg text-risk-high'
                            : existingPatient.last_niveau === 'modere'
                            ? 'bg-risk-midBg text-risk-mid'
                            : 'bg-risk-lowBg text-risk-low'
                        }`}>
                          {existingPatient.last_niveau === 'eleve' ? 'Élevé'
                            : existingPatient.last_niveau === 'modere' ? 'Modéré'
                            : 'Faible'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-4">
                    Cliquez sur "Analyser le risque" pour recalculer avec les données actuelles
                  </p>

                  {/* Bouton PDF disponible dès l'ouverture */}
                  <button
                    onClick={handlePDF}
                    className="mt-4 w-full py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    <FileDown className="w-4 h-4" />
                    Télécharger le rapport PDF
                  </button>
                </div>
              ) : (
                /* Aucune analyse précédente — état vide par défaut */
                <div className="bg-white rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                  <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center mb-4 opacity-50">
                    <Activity className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-400 mb-2">En attente d'analyse</h3>
                  <p className="text-gray-400 text-sm max-w-xs">
                    {existingPatient
                      ? 'Cliquez sur "Analyser le risque" pour obtenir une nouvelle prédiction'
                      : 'Saisissez les données cliniques du patient et cliquez sur "Analyser" pour obtenir une prédiction'}
                  </p>
                </div>
              )
            ) : (
              <>
                <ScoreCard
                  score={prediction.score}
                  niveau={prediction.niveau}
                  probabilite={prediction.probabilite}
                  message={prediction.message}
                />
                <ShapChart shap_values={prediction.shap_values} />
                <MedicalInsights
                  score={prediction.score}
                  niveau={prediction.niveau}
                  shap_values={prediction.shap_values}
                />

                {/* Action buttons */}
                <div className="flex gap-3">
                  <button
                    id="analyze-save"
                    onClick={handleSave}
                    disabled={saving || saved}
                    className={`flex-1 py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 ${
                      saved
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-white text-primary border border-primary hover:bg-primary-light'
                    } disabled:opacity-60`}
                  >
                    {saving ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : saved ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        {existingPatientId ? 'Analyse mise à jour' : 'Sauvegardé'}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {existingPatientId ? 'Mettre à jour l\'analyse' : 'Sauvegarder'}
                      </>
                    )}
                  </button>
                  <button
                    id="analyze-pdf"
                    onClick={handlePDF}
                    disabled={!savedId}
                    className="flex-1 py-3 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileDown className="w-5 h-5" />
                    Télécharger PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analyze;

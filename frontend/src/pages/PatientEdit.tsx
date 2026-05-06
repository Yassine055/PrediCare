import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { createScore, getPatient, predict, updatePatient } from '../api/endpoints';
import { PatientPayload } from '../types';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Cigarette,
  Droplets,
  FlaskConical,
  Heart,
  Save,
  User,
  Users,
} from 'lucide-react';

const emptyForm: PatientPayload = {
  nom: '',
  prenom: '',
  age: 45,
  imc: 25,
  glycemie_jeun: 5,
  hba1c: 5.5,
  tension_systolique: 120,
  tension_diastolique: 80,
  hdl: 1.5,
  ldl: 3,
  creatinine: 80,
  tabac: 0,
  antecedents_familiaux: 0,
};

const PatientEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<PatientPayload>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = Number(id);
    if (!id || Number.isNaN(patientId)) {
      setError('Patient introuvable.');
      setLoading(false);
      return;
    }

    const fetchPatient = async () => {
      setLoading(true);
      setError('');
      try {
        const patient = await getPatient(patientId);
        setForm({
          nom: patient.nom,
          prenom: patient.prenom,
          age: patient.age,
          imc: patient.imc,
          glycemie_jeun: patient.glycemie_jeun,
          hba1c: patient.hba1c,
          tension_systolique: patient.tension_systolique,
          tension_diastolique: patient.tension_diastolique,
          hdl: patient.hdl,
          ldl: patient.ldl,
          creatinine: patient.creatinine,
          tabac: patient.tabac,
          antecedents_familiaux: patient.antecedents_familiaux,
        });
      } catch {
        setError('Impossible de charger les informations du patient.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [id]);

  const update = <K extends keyof PatientPayload>(field: K, value: PatientPayload[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const patientId = Number(id);
    if (!id || Number.isNaN(patientId)) return;

    setSaving(true);
    setError('');
    try {
      await updatePatient(patientId, form);
      const predictionPayload = {
        age: form.age,
        imc: form.imc,
        glycemie_jeun: form.glycemie_jeun,
        hba1c: form.hba1c,
        tension_systolique: form.tension_systolique,
        tension_diastolique: form.tension_diastolique,
        hdl: form.hdl,
        ldl: form.ldl,
        creatinine: form.creatinine,
        tabac: form.tabac,
        antecedents_familiaux: form.antecedents_familiaux,
      };
      const prediction = await predict(predictionPayload);
      await createScore({
        patient_id: patientId,
        score: prediction.score,
        niveau: prediction.niveau,
        probabilite: prediction.probabilite,
        shap_values: prediction.shap_values,
      });
      navigate(`/patients/${patientId}`);
    } catch {
      setError('Erreur lors de la modification ou du recalcul du score.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-[220px] p-8">
        <button
          onClick={() => navigate(`/patients/${id}`)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à la fiche
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Modifier le patient</h1>
          <p className="text-gray-500 text-sm mt-1">
            Mettez à jour les données, puis le score et SHAP seront recalculés automatiquement.
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
          <form onSubmit={handleSubmit} className="max-w-5xl space-y-5">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Identité du patient</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Nom</label>
                  <input
                    type="text"
                    value={form.nom}
                    onChange={(event) => update('nom', event.target.value)}
                    required
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={form.prenom}
                    onChange={(event) => update('prenom', event.target.value)}
                    required
                    minLength={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Données principales</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Âge</label>
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={form.age}
                    onChange={(event) => update('age', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">IMC</label>
                  <input
                    type="number"
                    min={10}
                    max={60}
                    step={0.1}
                    value={form.imc}
                    onChange={(event) => update('imc', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Glycémie</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Glycémie à jeun</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    step={0.1}
                    value={form.glycemie_jeun}
                    onChange={(event) => update('glycemie_jeun', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">HbA1c (%)</label>
                  <input
                    type="number"
                    min={4}
                    max={15}
                    step={0.1}
                    value={form.hba1c}
                    onChange={(event) => update('hba1c', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Tension artérielle</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Systolique (mmHg)</label>
                  <input
                    type="number"
                    min={60}
                    max={250}
                    value={form.tension_systolique}
                    onChange={(event) => update('tension_systolique', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Diastolique (mmHg)</label>
                  <input
                    type="number"
                    min={40}
                    max={150}
                    value={form.tension_diastolique}
                    onChange={(event) => update('tension_diastolique', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Bilan lipidique</h2>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">HDL</label>
                  <input
                    type="number"
                    min={0.2}
                    max={3}
                    step={0.01}
                    value={form.hdl}
                    onChange={(event) => update('hdl', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">LDL</label>
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.01}
                    value={form.ldl}
                    onChange={(event) => update('ldl', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Créatinine</label>
                  <input
                    type="number"
                    min={30}
                    max={2000}
                    step={1}
                    value={form.creatinine}
                    onChange={(event) => update('creatinine', Number(event.target.value))}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Cigarette className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-gray-900">Facteurs de risque</h2>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cigarette className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Tabagisme</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => update('tabac', form.tabac === 1 ? 0 : 1)}
                    className={`toggle-switch ${form.tabac === 1 ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span className={`toggle-switch-dot ${form.tabac === 1 ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">Antécédents familiaux</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => update('antecedents_familiaux', form.antecedents_familiaux === 1 ? 0 : 1)}
                    className={`toggle-switch ${form.antecedents_familiaux === 1 ? 'bg-primary' : 'bg-gray-200'}`}
                  >
                    <span className={`toggle-switch-dot ${form.antecedents_familiaux === 1 ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate(`/patients/${id}`)}
                className="px-5 py-2.5 bg-white text-gray-600 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Enregistrer et recalculer
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default PatientEdit;

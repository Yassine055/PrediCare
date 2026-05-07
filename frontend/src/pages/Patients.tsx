import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getPatients, deletePatient, downloadPDF } from '../api/endpoints';
import { Patient } from '../types';
import { downloadCsv } from '../utils/exportCsv';
import {
  Search,
  Eye,
  Stethoscope,
  Download,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Activity,
  FileDown,
} from 'lucide-react';

const ITEMS_PER_PAGE = 10;

type FilterType = 'all' | 'élevé' | 'modéré' | 'faible';

const Patients = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Erreur chargement patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer ce patient ?')) return;
    setDeleting(id);
    try {
      await deletePatient(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Erreur suppression:', error);
    } finally {
      setDeleting(null);
    }
  };

  const handlePDF = async (id: number) => {
    try {
      await downloadPDF(id);
    } catch (error) {
      console.error('Erreur PDF:', error);
    }
  };

  const handleExportPatients = () => {
    const rows = filtered.map((patient) => ({
      ID: patient.id,
      Nom: patient.nom,
      Prenom: patient.prenom,
      Age: patient.age,
      IMC: patient.imc,
      Glycemie_jeun: patient.glycemie_jeun,
      HbA1c: patient.hba1c,
      Tension_systolique: patient.tension_systolique,
      Tension_diastolique: patient.tension_diastolique,
      HDL: patient.hdl,
      LDL: patient.ldl,
      Creatinine: patient.creatinine,
      Tabac: patient.tabac === 1 ? 'Oui' : 'Non',
      Antecedents_familiaux: patient.antecedents_familiaux === 1 ? 'Oui' : 'Non',
      Dernier_score: patient.last_score ?? '',
      Niveau: patient.last_niveau ?? '',
      Date_derniere_analyse: patient.last_score_date
        ? new Date(patient.last_score_date).toLocaleDateString('fr-FR')
        : '',
    }));

    downloadCsv('predicare_patients.csv', rows);
  };

  const filtered = patients
    .filter((p) => {
      const matchSearch = `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase());
      const niveauMap: Record<string, string> = { 'élevé': 'eleve', 'modéré': 'modere', 'faible': 'faible' };
      const matchFilter = filter === 'all' || p.last_niveau === niveauMap[filter];
      return matchSearch && matchFilter;
    })
    .sort((a, b) => (b.last_score || 0) - (a.last_score || 0));

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getNiveauBadge = (niveau?: string) => {
    switch (niveau?.toLowerCase()) {
      case 'élevé':
      case 'eleve':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-highBg text-risk-high">Élevé</span>;
      case 'modéré':
      case 'modere':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-midBg text-risk-mid">Modéré</span>;
      case 'faible':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-risk-lowBg text-risk-low">Faible</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">—</span>;
    }
  };

  const filters: { label: string; value: FilterType }[] = [
    { label: 'Tous', value: 'all' },
    { label: 'Élevé', value: 'élevé' },
    { label: 'Modéré', value: 'modéré' },
    { label: 'Faible', value: 'faible' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-0 lg:ml-[220px] p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Patients</h1>
            <p className="text-gray-500 text-sm mt-1">Gérez et consultez vos dossiers patients</p>
          </div>
          <button
            onClick={handleExportPatients}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white text-primary font-semibold rounded-xl border border-primary hover:bg-primary-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
        </div>

        {/* Recherche + Filtres */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          {/* Barre de recherche — full width sur mobile */}
          <div className="relative w-full mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="patients-search"
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher un patient..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Boutons filtres — scrollables sur mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => { setFilter(f.value); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  filter === f.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
            <Activity className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-gray-500 font-medium">Aucun patient trouvé</p>
            <p className="text-gray-400 text-sm">Ajustez vos filtres ou ajoutez un nouveau patient</p>
          </div>
        ) : (
          <>
            {/* Cards — visibles sur mobile uniquement */}
            <div className="lg:hidden space-y-3 mb-4">
              {paginated.map((patient) => (
                <div key={patient.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                        <span className="text-primary text-sm font-bold uppercase">
                          {patient.prenom?.[0]}{patient.nom?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {patient.prenom} {patient.nom}
                        </p>
                        <p className="text-xs text-gray-500">{patient.age} ans</p>
                      </div>
                    </div>
                    {getNiveauBadge(patient.last_niveau)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Score</p>
                      <p className="text-lg font-bold text-gray-900">
                        {patient.last_score?.toFixed(1) ?? '—'}
                      </p>
                      {patient.last_score_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(patient.last_score_date).toLocaleDateString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/patients/${patient.id}`)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all"
                        title="Voir la fiche"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate('/analyze', { state: { patient } })}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all"
                        title="Analyser"
                      >
                        <Stethoscope className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePDF(patient.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all"
                        title="Télécharger PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(patient.id)}
                        disabled={deleting === patient.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deleting === patient.id ? (
                          <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tableau — visible sur desktop uniquement */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                      <th className="px-6 py-3">Patient</th>
                      <th className="px-6 py-3">Âge</th>
                      <th className="px-6 py-3">Score</th>
                      <th className="px-6 py-3">Niveau</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginated.map((patient) => (
                      <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center">
                              <span className="text-primary text-sm font-semibold uppercase">
                                {patient.prenom?.[0]}{patient.nom?.[0]}
                              </span>
                            </div>
                            <p className="font-medium text-gray-900 text-sm capitalize">
                              {patient.prenom} {patient.nom}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{patient.age} ans</td>
                        <td className="px-6 py-4">
                          <span className="font-semibold text-sm text-gray-900">{patient.last_score?.toFixed(1) ?? '—'}</span>
                        </td>
                        <td className="px-6 py-4">{getNiveauBadge(patient.last_niveau)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {patient.last_score_date
                            ? new Date(patient.last_score_date).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => navigate(`/patients/${patient.id}`)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all" title="Voir la fiche patient">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button onClick={() => navigate('/analyze', { state: { patient } })} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all" title="Analyser ce patient">
                              <Stethoscope className="w-4 h-4" />
                            </button>
                            <button onClick={() => handlePDF(patient.id)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-light transition-all" title="Télécharger PDF">
                              <Download className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(patient.id)} disabled={deleting === patient.id} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-50" title="Supprimer">
                              {deleting === patient.id ? (
                                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} sur {filtered.length} patients
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${p === page ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                        {p}
                      </button>
                    ))}
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination mobile */}
            {totalPages > 1 && (
              <div className="lg:hidden flex items-center justify-between mt-4">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
                <span className="text-sm text-gray-500">Page {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 disabled:opacity-30">
                  Suivant <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Patients;

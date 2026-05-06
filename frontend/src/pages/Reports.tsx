import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import { getPatients, downloadPDF } from '../api/endpoints';
import { Patient } from '../types';
import { FileText, Download, Activity } from 'lucide-react';

const Reports = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await getPatients();
        // Afficher uniquement les patients qui ont un score enregistré
        setPatients(data.filter((p) => p.last_score != null));
      } catch (error) {
        console.error('Erreur chargement patients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const handlePDF = async (id: number) => {
    setDownloading(id);
    try {
      await downloadPDF(id);
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error);
    } finally {
      setDownloading(null);
    }
  };

  const getNiveauBadge = (niveau?: string) => {
    switch (niveau?.toLowerCase()) {
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

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <main className="ml-[220px] p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rapports PDF</h1>
          <p className="text-gray-500 text-sm mt-1">
            Téléchargez les rapports d'analyse de vos patients
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Compteur */}
          {!loading && patients.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{patients.length}</span> rapport{patients.length > 1 ? 's' : ''} disponible{patients.length > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Activity className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-gray-500 font-medium">Aucun rapport généré pour le moment</p>
              <p className="text-gray-400 text-sm">
                Analysez un patient depuis la page "Analyser" pour générer un rapport
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Âge</th>
                    <th className="px-6 py-3">Score</th>
                    <th className="px-6 py-3">Niveau</th>
                    <th className="px-6 py-3">Date analyse</th>
                    <th className="px-6 py-3 text-right">Rapport</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Patient */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center shrink-0">
                            <span className="text-primary text-sm font-semibold">
                              {patient.prenom?.[0]}{patient.nom?.[0]}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 text-sm">
                            {patient.prenom} {patient.nom}
                          </p>
                        </div>
                      </td>

                      {/* Âge */}
                      <td className="px-6 py-4 text-sm text-gray-600">{patient.age} ans</td>

                      {/* Score */}
                      <td className="px-6 py-4">
                        <span className="font-semibold text-sm text-gray-900">
                          {patient.last_score?.toFixed(1) ?? '—'}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/100</span>
                      </td>

                      {/* Niveau */}
                      <td className="px-6 py-4">{getNiveauBadge(patient.last_niveau)}</td>

                      {/* Date analyse */}
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {patient.last_score_date
                          ? new Date(patient.last_score_date).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      {/* Télécharger */}
                      <td className="px-6 py-4">
                        <div className="flex justify-end">
                          <button
                            onClick={() => handlePDF(patient.id)}
                            disabled={downloading === patient.id}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-light text-primary text-sm font-medium hover:bg-primary hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Télécharger le rapport PDF"
                          >
                            {downloading === patient.id ? (
                              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            PDF
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
      </main>
    </div>
  );
};

export default Reports;

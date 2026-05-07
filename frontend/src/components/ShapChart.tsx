import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { ShapValues } from '../types';

interface ShapChartProps {
  shap_values: ShapValues;
}

const labelMap: Record<string, string> = {
  age: 'Âge',
  imc: 'IMC',
  glycemie_jeun: 'Glycémie à jeun',
  hba1c: 'HbA1c',
  tension_systolique: 'Tension syst.',
  tension_diastolique: 'Tension diast.',
  hdl: 'HDL cholestérol',
  ldl: 'LDL cholestérol',
  creatinine: 'Créatinine',
  tabac: 'Tabagisme',
  antecedents_familiaux: 'Antécédents fam.',
};

const ShapChart = ({ shap_values }: ShapChartProps) => {
  const data = Object.entries(shap_values)
    .map(([key, value]) => ({
      name: labelMap[key] || key,
      value: Number(value.toFixed(4)),
      absValue: Math.abs(value),
    }))
    .sort((a, b) => b.absValue - a.absValue);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-1">
        Facteurs d'influence (SHAP)
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Impact de chaque variable sur la prédiction
      </p>

      {/* width 100% + height adaptatif = responsive */}
      <ResponsiveContainer width="100%" height={Math.max(data.length * 40, 300)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#374151' }}
            width={95}
          />
          <Tooltip
            formatter={(value: any) => [
              value > 0 ? `+${value} (Risque)` : `${value} (Protection)`,
              'Impact SHAP',
            ]}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '13px',
            }}
          />
          {/* Rouge = facteur de risque, Vert = facteur de protection */}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.value > 0 ? '#DC2626' : '#16A34A'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-600" />
          <span className="text-xs text-gray-600">Augmente le risque</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-600" />
          <span className="text-xs text-gray-600">Réduit le risque</span>
        </div>
      </div>
    </div>
  );
};

export default ShapChart;

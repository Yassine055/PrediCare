import { useEffect, useState } from 'react';

interface ScoreCardProps {
  score: number;
  niveau: string;
  probabilite: number;
  message: string;
}

const ScoreCard = ({ score, niveau, probabilite, message }: ScoreCardProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  const getColor = () => {
    switch (niveau.toLowerCase()) {
      case 'faible':
        return { main: '#27500A', bg: '#EAF3DE', label: 'Faible' };
      case 'modere':
      case 'modéré':
        return { main: '#633806', bg: '#FAEEDA', label: 'Modéré' };
      case 'eleve':
      case 'élevé':
        return { main: '#791F1F', bg: '#FCEBEB', label: 'Élevé' };
      default:
        return { main: '#0C447C', bg: '#E6F1FB', label: niveau };
    }
  };

  const color = getColor();

  useEffect(() => {
    let start = 0;
    const end = Math.round(score);
    if (end === 0) return;
    const duration = 1500;
    const stepTime = duration / end;

    const timer = setInterval(() => {
      start += 1;
      setAnimatedScore(start);
      if (start >= end) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [score]);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Score de Risque</h3>

      {/* Cercle SVG — bien centré */}
      <div className="relative w-48 h-48 mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke="#E5E7EB"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            stroke={color.main}
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {/* Score grand et lisible */}
          <span className="text-5xl font-bold leading-none" style={{ color: color.main }}>
            {animatedScore}
          </span>
          <span className="text-sm text-gray-400 mt-1">/100</span>
        </div>
      </div>

      {/* Badge niveau avec couleurs correspondantes */}
      <span
        className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold mb-3"
        style={{ backgroundColor: color.bg, color: color.main }}
      >
        {color.label}
      </span>

      {/* Probabilité */}
      <p className="text-gray-600 text-sm mb-2">
        Probabilité : <span className="font-semibold">{(probabilite * 100).toFixed(1)}%</span>
      </p>

      {/* Message clinique */}
      <p className="text-gray-500 text-sm text-center leading-relaxed max-w-xs">{message}</p>
    </div>
  );
};

export default ScoreCard;

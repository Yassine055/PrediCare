import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Clipboard,
  Brain,
  FileText,
  ChevronDown,
  Activity,
  BarChart3,
  Shield,
  Download,
  Zap,
  ArrowRight,
} from 'lucide-react';

function useCounter(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (startOnView && !inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView, startOnView]);

  return { count, ref };
}

const fadeUp: any = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
};

const fadeIn: any = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } },
};

const stagger: any = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const Landing = () => {
  const navigate = useNavigate();

  const c1 = useCounter(3.1, 2000);
  const c2 = useCounter(60, 2000);
  const c3 = useCounter(87, 2000);

  return (
    <div className="overflow-x-hidden">
      <section
        className="relative min-h-screen flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0a0f1e 0%, #0C447C 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            animation: 'gridMove 20s linear infinite',
          }}
        />

        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-400/10 rounded-full blur-[100px]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-blue-200 text-sm font-medium">
              <Zap className="w-4 h-4 text-yellow-400" />
              Propulsé par XGBoost + SHAP AI
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-7xl md:text-8xl font-bold text-white mb-6 tracking-tight"
          >
            Predi<span className="text-blue-400">Care</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-blue-200 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            Détectez le diabète de type 2 avant qu'il n'apparaisse grâce à l'intelligence artificielle explicable
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 px-8 py-3.5 bg-white text-primary font-semibold rounded-xl hover:bg-blue-50 transition-all duration-200 shadow-lg shadow-black/20"
            >
              Commencer maintenant
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-8 py-3.5 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              En savoir plus
            </button>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 12, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <ChevronDown className="w-8 h-8 text-white/50" />
        </motion.div>
      </section>

      <section className="py-24 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6"
        >
          <motion.h2 variants={fadeIn} className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Le diabète au Maroc en chiffres
          </motion.h2>
          <motion.p variants={fadeIn} className="text-gray-500 text-center mb-16 max-w-lg mx-auto">
            Une crise silencieuse qui nécessite une détection précoce
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { ref: c1.ref, value: `${c1.count.toFixed(1)}M`, label: 'Diabétiques au Maroc', color: '#0C447C' },
              { ref: c2.ref, value: `${c2.count}%`, label: 'Diagnostiqués trop tard', color: '#791F1F' },
              { ref: c3.ref, value: `${c3.count}%`, label: 'Précision AUC-ROC', color: '#27500A' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                ref={stat.ref}
                className="text-center p-8 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <p className="text-5xl font-bold mb-2" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="how-it-works" className="py-24 bg-bg">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Comment ça marche ?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-center mb-16 max-w-lg mx-auto">
            Trois étapes simples pour une prédiction fiable
          </motion.p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Clipboard, step: '01', title: 'Saisir les données', desc: 'Entrez les 11 paramètres cliniques du patient' },
              { icon: Brain, step: '02', title: "L'IA calcule le score", desc: 'XGBoost analyse les données et SHAP explique le résultat' },
              { icon: FileText, step: '03', title: 'Rapport PDF', desc: 'Téléchargez un rapport médical complet et détaillé' },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center group hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-light flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                  <item.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary/40 tracking-widest">ÉTAPE {item.step}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-2 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 text-gray-300">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-24 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Fonctionnalités clés
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 text-center mb-16 max-w-lg mx-auto">
            Des outils puissants pour les professionnels de santé
          </motion.p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Activity, title: 'Score de risque 0-100', desc: 'Évaluation précise du risque diabétique basée sur 11 paramètres cliniques', color: '#0C447C' },
              { icon: BarChart3, title: 'IA Explicable SHAP', desc: "Comprenez l'impact de chaque facteur grâce aux valeurs SHAP interactives", color: '#185FA5' },
              { icon: Shield, title: 'Dashboard médecin', desc: 'Suivi complet de vos patients avec statistiques et historique', color: '#27500A' },
              { icon: Download, title: 'Rapport PDF', desc: 'Générez des rapports médicaux professionnels en un clic', color: '#633806' },
            ].map((feat, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="group p-6 rounded-2xl border border-gray-100 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-default"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200"
                  style={{ backgroundColor: `${feat.color}15` }}
                >
                  <feat.icon className="w-6 h-6" style={{ color: feat.color }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feat.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-20" style={{ background: 'linear-gradient(135deg, #0C447C 0%, #0a1628 100%)' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-5xl mx-auto px-6"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '0.87', label: 'AUC-ROC' },
              { value: '5000', label: 'Patients analysés' },
              { value: '11', label: 'Features cliniques' },
              { value: '<1s', label: 'Temps de prédiction' },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeUp}>
                <p className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-blue-300 text-sm font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="py-24 bg-white">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Prêt à détecter plus tôt ?
          </motion.h2>
          <motion.p variants={fadeUp} className="text-gray-500 mb-8 max-w-md mx-auto">
            Rejoignez les professionnels de santé qui utilisent l'IA pour sauver des vies.
          </motion.p>
          <motion.div variants={fadeUp}>
            <button
              onClick={() => navigate('/register')}
              className="group inline-flex items-center gap-2 px-10 py-4 bg-primary text-white font-semibold rounded-xl hover:bg-primary-medium transition-colors duration-200 shadow-lg shadow-primary/30"
            >
              Créer mon compte gratuitement
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </motion.div>
      </section>

      <footer className="py-10" style={{ background: '#0C447C' }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-white" />
            <span className="text-white font-bold">PrediCare</span>
          </div>
          <p className="text-blue-200 text-sm">
            © 2025 PrediCare — Détection précoce du diabète de type 2
          </p>
          <div className="flex gap-4">
            <button onClick={() => navigate('/login')} className="text-blue-200 hover:text-white text-sm transition-colors">
              Connexion
            </button>
            <button onClick={() => navigate('/register')} className="text-blue-200 hover:text-white text-sm transition-colors">
              Inscription
            </button>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
      `}</style>
    </div>
  );
};

export default Landing;

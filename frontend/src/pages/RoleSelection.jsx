import { motion } from "framer-motion";
import {
  ScanEye,
  Stethoscope,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

function RoleSelection({ onSelectRole }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12">

      <div className="w-full max-w-5xl">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
              <ScanEye className="w-9 h-9 text-slate-950" />
            </div>
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            RetinaSafe
          </h1>

          <p className="mt-4 text-lg text-slate-400">
            Explainable AI-based diabetic retinopathy screening
          </p>
        </motion.div>


        {/* Question */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-center mt-14 mb-8"
        >
          <h2 className="text-2xl font-semibold">
            Who are you?
          </h2>

          <p className="mt-2 text-slate-400">
            Select your role to enter the appropriate workflow.
          </p>
        </motion.div>


        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <RoleCard
            icon={ScanEye}
            title="PHC Worker"
            subtitle="Screen a patient"
            description="Register the patient, capture a fundus image and run AI-assisted screening."
            onClick={() => onSelectRole("phc")}
            delay={0.35}
          />

          <RoleCard
            icon={Stethoscope}
            title="Ophthalmologist"
            subtitle="Review screening"
            description="Review AI results, Grad-CAM explanations, clinical evidence and referral decisions."
            onClick={() => onSelectRole("doctor")}
            delay={0.45}
          />

        </div>


        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex justify-center items-center gap-2 mt-10 text-sm text-slate-500"
        >
          <ShieldCheck className="w-4 h-4" />

          AI-assisted screening • Human clinical review

        </motion.div>

      </div>

    </main>
  );
}


function RoleCard({
  icon: Icon,
  title,
  subtitle,
  description,
  onClick,
  delay,
}) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{
        y: -6,
        scale: 1.01,
      }}
      whileTap={{
        scale: 0.98,
      }}
      className="group text-left p-8 rounded-3xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 transition-all"
    >

      <div className="flex items-start justify-between">

        <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center">
          <Icon className="w-7 h-7 text-slate-950" />
        </div>

        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white group-hover:text-slate-950 transition">
          <ArrowRight className="w-5 h-5" />
        </div>

      </div>


      <p className="text-sm text-slate-500 mt-8">
        {subtitle}
      </p>

      <h3 className="text-2xl font-semibold mt-1">
        {title}
      </h3>

      <p className="text-slate-400 mt-3 leading-relaxed">
        {description}
      </p>

      <div className="mt-7 text-sm font-semibold">
        Continue →
      </div>

    </motion.button>
  );
}

export default RoleSelection;
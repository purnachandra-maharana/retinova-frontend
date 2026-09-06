import { motion } from "framer-motion";
import {
  ScanEye,
  Users,
  FileCheck,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

function Dashboard() {
  return (
    <main className="p-8">

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900">
          Good morning
        </h1>

        <p className="mt-2 text-slate-500">
          Start a new retinal screening or review previous results.
        </p>
      </motion.div>

      {/* Main screening card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="rounded-3xl bg-slate-900 p-8 text-white mb-8"
      >
        <div className="flex items-center justify-between">

          <div className="max-w-xl">

            <div className="flex items-center gap-2 mb-4">
              <ScanEye className="w-6 h-6" />

              <span className="text-sm font-medium">
                AI-assisted screening
              </span>
            </div>

            <h2 className="text-3xl font-bold">
              Screen a patient
              <br />
              in a few simple steps.
            </h2>

            <p className="mt-4 text-slate-300">
              Capture or upload a fundus image and let the
              explainable AI pipeline analyze it.
            </p>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-6 inline-flex items-center gap-2 bg-white text-slate-900 px-5 py-3 rounded-xl font-semibold"
            >
              Start New Screening
              <ArrowRight className="w-4 h-4" />
            </motion.button>

          </div>

          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="hidden lg:flex w-40 h-40 rounded-full bg-white/10 items-center justify-center"
          >
            <ScanEye className="w-20 h-20 text-white/80" />
          </motion.div>

        </div>
      </motion.div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

        <StatCard
          icon={Users}
          title="Patients Screened"
          value="128"
          description="This month"
        />

        <StatCard
          icon={FileCheck}
          title="Completed"
          value="114"
          description="Screenings"
        />

        <StatCard
          icon={AlertTriangle}
          title="Referable"
          value="14"
          description="Require review"
        />

        <StatCard
          icon={ScanEye}
          title="System Status"
          value="Ready"
          description="AI engine online"
        />

      </div>

    </main>
  );
}

function StatCard({ icon: Icon, title, value, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white border border-slate-200 rounded-2xl p-5"
    >
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-slate-700" />
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {description}
      </p>
    </motion.div>
  );
}

export default Dashboard;
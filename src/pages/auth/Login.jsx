import { useState } from "react";
import { login } from "../../services/api";

const ROLE_OPTIONS = [
  { value: "phc", label: "PHC Worker", description: "Screen patients at a primary health centre" },
  { value: "doctor", label: "Ophthalmologist", description: "Review cases and make clinical decisions" },
];

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("signin");
  const [role, setRole] = useState("phc");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedRole = ROLE_OPTIONS.find((item) => item.value === role) || ROLE_OPTIONS[0];

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  function handleSignIn(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedUsername = username.trim().toLowerCase();
    if (!normalizedUsername || !password) {
      setError("Enter your username and password.");
      return;
    }

    setLoading(true);
    login(normalizedUsername, password)
      .then((result) => {
        const user = result.user;
        const normalizedRole = String(user.role || "").toLowerCase();
        if (normalizedRole !== role) {
          throw new Error("Your account is not assigned to the selected role.");
        }
        onLogin({
          ...user,
          role: normalizedRole,
          roleName: normalizedRole === "doctor" ? "Ophthalmologist" : "PHC Worker",
        });
      })
      .catch((requestError) => {
        setError(requestError.message || "Unable to sign in.");
      })
      .finally(() => setLoading(false));
  }

  function handleRegister(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !cleanUsername || !password || !confirmPassword) {
      setError("Complete all required registration fields.");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (cleanUsername.length < 4) {
      setError("Username must contain at least 4 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("Account creation is managed by an administrator. Contact your system administrator.");
  }

  return (
    <main className="min-h-screen bg-[#061a1d] text-white flex items-center justify-center px-5 py-8 sm:px-6 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-48 -right-48 w-[620px] h-[620px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-400/5 pointer-events-none" />

      <div className="relative z-10 w-full max-w-5xl">
        <div className="grid lg:grid-cols-[1fr_500px] gap-10 lg:gap-16 items-center">
          <div className="hidden lg:block">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-400/20 bg-teal-400/5 text-teal-300 text-[10px] uppercase tracking-[0.2em] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              Clinical screening platform
            </div>

            <h1 className="text-6xl xl:text-7xl font-bold tracking-tight mt-6 leading-[0.95]">
              Retin<span className="text-teal-400">ova</span>
            </h1>

            <p className="mt-6 text-lg text-slate-400 max-w-lg leading-relaxed">
              Explainable AI-assisted diabetic retinopathy screening for connected rural healthcare.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-10 max-w-lg">
              <Feature title="AI-assisted" text="Retinal image analysis" />
              <Feature title="Explainable" text="Grad-CAM evidence" />
              <Feature title="PHC ready" text="Primary-care workflow" />
              <Feature title="Doctor review" text="Human clinical decision" />
            </div>
          </div>

          <section className="rounded-[30px] border border-white/10 bg-[#0d2428]/95 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
            <div className="lg:hidden text-center mb-7">
              <p className="text-[10px] uppercase tracking-[0.28em] text-teal-300 font-bold">
                Intelligent retinal screening
              </p>
              <h1 className="text-5xl font-bold tracking-tight mt-2">
                Retin<span className="text-teal-400">ova</span>
              </h1>
            </div>

            <div className="flex rounded-2xl bg-[#081b1e] border border-white/10 p-1.5 mb-7">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  mode === "signin"
                    ? "bg-teal-400 text-[#062024] shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                  mode === "register"
                    ? "bg-teal-400 text-[#062024] shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign up / Register
              </button>
            </div>

            <div className="mb-6">
              <p className="text-sm text-teal-300 font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold mt-1">
                {mode === "signin" ? "Sign in to Retinova" : "Register a clinical account"}
              </h2>
              <p className="mt-2 text-slate-400 text-sm leading-relaxed">
                {mode === "signin"
                  ? "Select your clinical role and enter your account credentials."
                  : "Create a prototype account for the PHC or ophthalmologist workspace."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {ROLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value);
                    setError("");
                    setSuccess("");
                  }}
                  className={`rounded-2xl border p-4 text-left transition-all duration-300 ${
                    role === option.value
                      ? option.value === "phc"
                        ? "border-teal-400 bg-teal-400/10"
                        : "border-cyan-400 bg-cyan-400/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500 font-bold">
                    {option.value === "phc" ? "Workspace 01" : "Workspace 02"}
                  </p>
                  <p className="mt-1 text-sm font-bold">{option.label}</p>
                </button>
              ))}
            </div>

            <form onSubmit={mode === "signin" ? handleSignIn : handleRegister}>
              {mode === "register" && (
                <>
                  <Field
                    label="Full name"
                    type="text"
                    value={fullName}
                    onChange={setFullName}
                    placeholder="Enter your full name"
                    autoComplete="name"
                  />

                  <Field
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </>
              )}

              <Field
                label={mode === "signin" ? (role === "phc" ? "PHC Worker ID" : "Doctor ID") : "Username"}
                type="text"
                value={username}
                onChange={setUsername}
                placeholder={mode === "signin" ? (role === "phc" ? "Enter PHC worker ID" : "Enter doctor ID") : "Choose a username"}
                autoComplete="username"
              />

              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder={mode === "register" ? "At least 6 characters" : "Enter your password"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                extraClass="mt-5"
              />

              {mode === "register" && (
                <Field
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  extraClass="mt-5"
                />
              )}

              {error && (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 rounded-xl bg-teal-400 px-5 py-4 font-bold text-[#062024] hover:bg-teal-300 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? mode === "signin"
                    ? "Signing in..."
                    : "Creating account..."
                  : mode === "signin"
                    ? `Sign in as ${selectedRole.label}`
                    : `Create ${selectedRole.label} account`}
              </button>
            </form>

            {mode === "signin" ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                  Prototype demo access
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  PHC: <span className="text-slate-200 font-semibold">phc001</span> / <span className="text-slate-200 font-semibold">retinasafe</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Doctor: <span className="text-slate-200 font-semibold">doctor001</span> / <span className="text-slate-200 font-semibold">retinasafe</span>
                </p>
              </div>
            ) : (
              <p className="mt-5 text-center text-xs text-slate-500 leading-relaxed">
                Prototype registration stores the account in this browser only. It is not a production authentication system.
              </p>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => switchMode(mode === "signin" ? "register" : "signin")}
                className="text-sm text-teal-300 hover:text-teal-200 font-semibold transition"
              >
                {mode === "signin" ? "New to Retinova? Create an account →" : "Already registered? Sign in →"}
              </button>
            </div>
          </section>
        </div>

        <p className="text-center text-xs text-slate-600 mt-7">
          Retinova screening decision-support prototype • AI-assisted screening • Human clinical review
        </p>
      </div>
    </main>
  );
}

function Field({ label, type, value, onChange, placeholder, autoComplete, extraClass = "" }) {
  return (
    <div className={extraClass}>
      <label className="block text-sm font-semibold text-slate-300 mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full rounded-xl border border-white/10 bg-[#081b1e] px-4 py-3.5 text-white placeholder:text-slate-600 outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-400/5 transition"
      />
    </div>
  );
}

function Feature({ title, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-bold text-slate-200">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{text}</p>
    </div>
  );
}

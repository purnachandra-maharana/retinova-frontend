import { useCallback, useEffect, useMemo, useState } from "react";
import { getCases } from "../../services/api";

function RetinovaLogo({ compact = false, dark = false }) {
  const size = compact ? 44 : 56;
  return (
    <div className={`flex items-center ${compact ? "gap-2.5" : "gap-3"}`}>
      <div
        className="retinova-brand-eye"
        style={{ width: size, height: Math.round(size * 0.72) }}
        aria-hidden="true"
      >
        <span className="retinova-brand-glow" />
        <svg viewBox="0 0 100 64" className="w-full h-full overflow-visible">
          <path
            className={`retinova-brand-lid ${dark ? "retinova-brand-lid-dark" : ""}`}
            d="M5 32 C24 6, 76 6, 95 32 C76 20, 24 20, 5 32 Z"
          />
          <path
            className={`retinova-brand-lid ${dark ? "retinova-brand-lid-dark" : ""}`}
            d="M5 32 C24 58, 76 58, 95 32 C76 44, 24 44, 5 32 Z"
          />
          <ellipse cx="50" cy="32" rx="27" ry="22" className="retinova-brand-sclera" />
          <circle cx="50" cy="32" r="18" className="retinova-brand-iris-ring" />
          <circle cx="50" cy="32" r="13" className="retinova-brand-iris" />
          <circle cx="50" cy="32" r="6" className="retinova-brand-pupil" />
          <circle cx="46" cy="27" r="2.5" className="retinova-brand-highlight" />
          <path d="M12 32 C29 10, 71 10, 88 32" className="retinova-brand-outline" />
          <path d="M12 32 C29 54, 71 54, 88 32" className="retinova-brand-outline retinova-brand-outline-bottom" />
          <circle cx="50" cy="32" r="29" className="retinova-brand-ring" />
          <path d="M18 32 H82" className="retinova-brand-scan" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className={`font-black tracking-[0.06em] leading-none ${compact ? "text-[17px]" : "text-[20px]"} ${dark ? "text-white" : "text-[#0F2742]"}`}>
          Retinova
        </div>
        {!compact && (
          <div className={`text-[8px] uppercase tracking-[0.14em] font-semibold mt-1 ${dark ? "text-[#A9C0CC]" : "text-[#647887]"}`}>
            AI-Powered Diabetic Retinopathy Screening
          </div>
        )}
      </div>
    </div>
  );
}

export default function DoctorDashboard({ onBack, onReviewCase, session, onLogout }) {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [queueMode, setQueueMode] = useState("new");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPage, setMenuPage] = useState("dashboard");

  const loadCases = useCallback(async (refresh = false) => {
    try {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      const response = await getCases();
      const list = Array.isArray(response?.cases) ? response.cases : [];
      setCases(list.map((item) => {
        const rawConfidence = item.confidence == null ? null : Number(item.confidence);
        const confidence = rawConfidence == null ? null : rawConfidence <= 1 ? Math.round(rawConfidence * 100) : Math.round(rawConfidence);
        const statusMap = { PENDING: "Pending", REVIEWED: "Reviewed", REFERRED: "Referred" };
        const gradeMatch = String(item.classification || "").match(/Grade\s*([0-4])/i);
        const grade = item.dr_level != null ? Number(item.dr_level) : gradeMatch ? Number(gradeMatch[1]) : null;
        return {
          screeningId: item.id,
          caseId: item.case_id || `RS-${item.id}`,
          patient: item.full_name || "Unknown patient",
          patientCode: item.patient_code || "—",
          age: item.age ?? "—",
          sex: item.sex || "—",
          eye: item.eye === "LEFT" ? "L" : item.eye === "RIGHT" ? "R" : "—",
          grade: Number.isInteger(grade) ? grade : null,
          classification: item.classification || "Analysis pending",
          confidence,
          status: statusMap[item.status] || item.status || "Pending",
          clinic: item.clinic_name || "Clinic not recorded",
          createdAt: item.created_at || null,
        };
      }));
    } catch (e) {
      console.error(e);
      setError(e?.message || "Unable to load screening cases.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  const filteredCases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter((item) => {
      const queueMatch = queueMode === "new" ? item.status === "Pending" : ["Reviewed", "Referred"].includes(item.status);
      const filterMatch = filter === "all" || (filter === "pending" && item.status === "Pending") || (filter === "reviewed" && item.status === "Reviewed") || (filter === "referral" && (item.status === "Referred" || (item.grade != null && item.grade >= 2)));
      const searchMatch = !q || [item.caseId,item.patient,item.patientCode,item.clinic].some((v) => String(v).toLowerCase().includes(q));
      return queueMatch && filterMatch && searchMatch;
    });
  }, [cases, queueMode, filter, search]);

  const stats = useMemo(() => {
    const pending = cases.filter(c=>c.status==='Pending').length;
    const reviewed = cases.filter(c=>c.status==='Reviewed').length;
    const referred = cases.filter(c=>c.status==='Referred' || (c.grade != null && c.grade >= 2)).length;
    const grades = [0,0,0,0,0];
    const eyes = { R:0, L:0, both:0 };
    cases.forEach(c=>{ if(c.grade!=null&&c.grade>=0&&c.grade<=4) grades[c.grade]++; if(c.eye==='R')eyes.R++; else if(c.eye==='L')eyes.L++; else eyes.both++; });
    const days = Array.from({length:7},(_,i)=>{ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-(6-i)); const key=d.toISOString().slice(0,10); return { label:d.toLocaleDateString('en-IN',{weekday:'short'}), value:cases.filter(c=>{const x=new Date(c.createdAt); return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===key;}).length }; });
    return {pending,reviewed,referred,grades,eyes,days};
  }, [cases]);

  if (menuPage !== "dashboard") return <DoctorUtilityPage page={menuPage} session={session} onBack={()=>setMenuPage("dashboard")} onLogout={onLogout} />;

  return (
    <div className="min-h-screen bg-[#F4F8FB] text-[#172B3A]">
      <style>{`@keyframes retinovaBrandPulse{0%,100%{transform:scale(.96);opacity:.9}50%{transform:scale(1.05);opacity:1}} @keyframes retinovaBrandRing{0%,100%{transform:scale(.92);opacity:.3}50%{transform:scale(1.05);opacity:.8}} @keyframes retinovaBrandScan{0%{transform:translateY(-18px);opacity:0}18%{opacity:.95}82%{opacity:.95}100%{transform:translateY(18px);opacity:0}} @keyframes retinovaBrandBlink{0%,44%,48%,100%{transform:scaleY(1)}46%,47%{transform:scaleY(.08)}} .retinova-brand-eye{position:relative;display:flex;align-items:center;justify-content:center;flex:none} .retinova-brand-glow{position:absolute;inset:10%;border-radius:999px;background:radial-gradient(circle,rgba(54,197,216,.38),transparent 68%);filter:blur(5px);animation:retinovaBrandPulse 3s ease-in-out infinite} .retinova-brand-lid{fill:#0F2742} .retinova-brand-lid-dark{fill:#F7FCFD} .retinova-brand-sclera{fill:#fff;filter:drop-shadow(0 0 2px rgba(54,197,216,.25))} .retinova-brand-iris-ring{fill:none;stroke:#36C5D8;stroke-width:3;animation:retinovaBrandRing 2.4s ease-in-out infinite} .retinova-brand-iris{fill:#E96B3B;stroke:#F8B15C;stroke-width:2;transform-origin:50px 32px;animation:retinovaBrandPulse 2.7s ease-in-out infinite} .retinova-brand-pupil{fill:#071A2D} .retinova-brand-highlight{fill:#fff} .retinova-brand-outline{fill:none;stroke:#36C5D8;stroke-width:2;stroke-linecap:round;opacity:.9} .retinova-brand-outline-bottom{opacity:.4} .retinova-brand-ring{fill:none;stroke:#159A9C;stroke-width:1.4;stroke-dasharray:3 5;transform-origin:50px 32px;animation:retinovaBrandRing 4s linear infinite} .retinova-brand-scan{fill:none;stroke:#36C5D8;stroke-width:1.8;stroke-linecap:round;filter:drop-shadow(0 0 4px rgba(54,197,216,.9));animation:retinovaBrandScan 2.2s ease-in-out infinite} .retinova-brand-eye svg{overflow:visible} @keyframes doctorPulse{0%,100%{transform:scale(.96);opacity:.8}50%{transform:scale(1.05);opacity:1}} @keyframes doctorScan{0%{transform:translateY(-35px);opacity:.05}50%{transform:translateY(35px);opacity:1}100%{transform:translateY(-35px);opacity:.05}}`}</style>
      <div className="flex min-h-screen">
        <aside className="hidden lg:flex w-[224px] shrink-0 bg-[#0F2742] text-white flex-col sticky top-0 h-screen">
          <div className="px-5 py-6 border-b border-white/10"><RetinovaLogo dark /></div>
          <div className="flex-1 px-4 py-5">
            <div className="px-3 pb-3 text-[10px] uppercase tracking-[.2em] text-[#8FA7B8] font-bold">Clinical workspace</div>
            <SideItem active label="Dashboard" icon="⌂" onClick={()=>{}} />
            <SideItem label="New Screenings" icon="＋" onClick={()=>{setQueueMode('new');setFilter('all');window.scrollTo({top:0,behavior:'smooth'});}} />
            <SideItem label="Previous Reviews" icon="▤" onClick={()=>{setQueueMode('previous');setFilter('all');window.scrollTo({top:0,behavior:'smooth'});}} />
            <SideItem label="Referral Cases" icon="⚑" onClick={()=>{setQueueMode('previous');setFilter('referral');window.scrollTo({top:0,behavior:'smooth'});}} />
            <SideItem label="Refresh Cases" icon="↻" onClick={()=>loadCases(true)} />
            <SideItem label="Settings" icon="⚙" onClick={()=>setMenuPage('settings')} />
            <SideItem label="Help & Guidance" icon="?" onClick={()=>setMenuPage('help')} />
          </div>
          <div className="px-4 pb-5">
            <div className="rounded-2xl border border-[#36C5D8]/25 bg-[#071A2D] p-4 mb-3">
              <div className="relative mx-auto w-14 h-14 rounded-full border border-[#36C5D8]/30 flex items-center justify-center overflow-hidden bg-[#061624]"><div className="w-8 h-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd18a_0,#e96b3b_45%,#b83b2f_70%,#0F2742_72%)]" style={{animation:'doctorPulse 3s ease-in-out infinite'}}/><div className="absolute left-2 right-2 top-1/2 h-px bg-[#36C5D8]" style={{animation:'doctorScan 2.3s ease-in-out infinite'}}/></div>
              <p className="text-center text-xs font-semibold mt-3">Retinal review active</p>
            </div>
            <button onClick={onLogout} className="w-full rounded-xl border border-[#36C5D8]/30 py-3 text-sm font-semibold hover:bg-white/[0.08]">↪ Sign Out</button>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <header className="sticky top-0 z-50 h-[76px] bg-white border-b border-[#D8E4EC] flex items-center justify-between px-5 sm:px-8 xl:px-10">
            <div className="lg:hidden"><RetinovaLogo compact /></div>
            <div className="hidden lg:flex items-center gap-5">
            <RetinovaLogo compact />
            <div className="h-8 w-px bg-[#D8E4EC]" />
            <div>
              <div className="text-[10px] uppercase tracking-[.18em] text-[#159A9C] font-bold">Ophthalmology review centre</div>
              <div className="text-sm text-[#647887] mt-1">AI-assisted clinical review</div>
            </div>
          </div>
            <div className="flex items-center gap-3">
              <div className="hidden xl:block text-right mr-1">
                <div className="text-[10px] text-[#7A8D9B]">Clinical workstation</div>
                <div className="text-xs font-bold text-[#0F2742]">Ophthalmology Review</div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full bg-[#E8F7F0] border border-[#CBEAD9]">
                <span className="w-2 h-2 rounded-full bg-[#20A464] animate-pulse"/>
                <span className="text-xs font-bold text-[#168553]">System ready</span>
              </div>
              <div className="w-9 h-9 rounded-full bg-[#D9F3F4] text-[#0F2742] flex items-center justify-center text-xs font-bold">
                DR
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-[10px] text-[#7A8D9B]">Signed in as</div>
                <div className="text-xs font-bold text-[#172B3A]">{session?.username || "doctor001"}</div>
              </div>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Open doctor menu"
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((value) => !value)}
                  className="w-10 h-10 rounded-xl border border-[#D8E4EC] bg-white text-[#0F2742] flex items-center justify-center text-xl leading-none shadow-sm hover:border-[#36C5D8] hover:bg-[#D9F3F4] transition"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 w-60 rounded-2xl border border-[#D8E4EC] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)] p-2 z-[100]">
                    <div className="px-3 py-2 border-b border-[#E4EDF2] mb-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7A8D9B] font-bold">Clinical workspace</p>
                      <p className="text-sm font-bold text-[#172B3A] mt-1">{session?.username || "doctor001"}</p>
                    </div>
                    <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("dashboard"); setQueueMode("new"); setFilter("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">New Screenings</button>
                    <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("dashboard"); setQueueMode("previous"); setFilter("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Previous Reviews</button>
                    <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("dashboard"); setQueueMode("previous"); setFilter("referral"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Referral Cases</button>
                    <button type="button" onClick={() => { setMenuOpen(false); loadCases(true); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Refresh Cases</button>
                    <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("settings"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Settings</button>
                    <button type="button" onClick={() => { setMenuOpen(false); setMenuPage("help"); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#294152] hover:bg-[#D9F3F4] hover:text-[#0F2742] transition">Help &amp; Guidance</button>
                    <div className="border-t border-[#E4EDF2] my-1"/>
                    <button type="button" onClick={() => { setMenuOpen(false); onLogout(); }} className="w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-semibold text-[#D9534F] hover:bg-[#FCEBEA] transition">Sign out</button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-7 xl:p-9 max-w-[1500px] mx-auto">
            <section className="relative overflow-hidden rounded-2xl bg-[#0F2742] text-white p-6 md:p-7 mb-5"><div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-[#1E5A7A]/35 to-transparent"/><div className="relative flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6"><div><p className="text-[10px] uppercase tracking-[.22em] text-[#36C5D8] font-bold">Clinical dashboard</p><h1 className="text-3xl md:text-4xl font-bold mt-2">Welcome, Ophthalmologist</h1><p className="text-sm text-[#B8C8D2] mt-2 max-w-2xl">Review retinal screening cases, inspect AI evidence and record the final clinical decision.</p></div><div className="flex items-center gap-4"><div className="relative w-24 h-24 rounded-2xl bg-[#071A2D] border border-[#36C5D8]/25 flex items-center justify-center overflow-hidden"><div className="absolute inset-3 rounded-full border border-dashed border-[#36C5D8]/30" style={{animation:'doctorPulse 4s ease-in-out infinite'}}/><div className="w-12 h-12 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ffd18a_0,#e96b3b_45%,#b83b2f_70%,#0F2742_72%)]" style={{animation:'doctorPulse 3s ease-in-out infinite'}}/><div className="absolute left-2 right-2 top-1/2 h-px bg-[#36C5D8]" style={{animation:'doctorScan 2.2s ease-in-out infinite'}}/></div><div><p className="text-xs font-bold">Retinal analysis</p><p className="text-[11px] text-[#9AAAB5] mt-1">AI evidence ready for review</p></div></div></div></section>

            <section className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5"><DashStat label="New screenings" value={stats.pending} note="Awaiting clinical review" tone="blue"/><DashStat label="Previous reviews" value={stats.reviewed} note="Clinical decisions recorded" tone="green"/><DashStat label="Referral cases" value={stats.referred} note="Grade ≥2 or referred" tone="red"/><DashStat label="Total cases" value={cases.length} note="Loaded screening records" tone="navy"/></section>

            <section className="grid xl:grid-cols-[1.15fr_1fr_1fr] gap-4 mb-5"><DashPanel title="Screening volume" subtitle="Last 7 days"><div className="h-40 flex items-end gap-2 pt-5 border-b border-[#E4EDF2]">{stats.days.map((d,i)=>{const max=Math.max(...stats.days.map(x=>x.value),1);return <div key={i} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"><b className="text-[9px] text-[#647887]">{d.value}</b><div className="w-full max-w-9 rounded-t-md bg-[#D9F3F4] overflow-hidden" style={{height:`${Math.max(8,d.value/max*100)}%`}}><div className="h-full bg-[#159A9C]"/></div><span className="text-[9px] text-[#7A8D9B]">{d.label}</span></div>})}</div></DashPanel><DashPanel title="DR grade distribution" subtitle="AI classification by grade"><div className="h-40 flex items-end gap-2 pt-5">{stats.grades.map((v,g)=>{const max=Math.max(...stats.grades,1);return <div key={g} className="flex-1 h-full flex flex-col items-center justify-end gap-1.5"><b className="text-[9px] text-[#647887]">{v}</b><div className="w-full rounded-t-md bg-[#EEF5F7] overflow-hidden" style={{height:`${Math.max(8,v/max*100)}%`}}><div className={`h-full ${g>=2?'bg-[#D9534F]':'bg-[#1E5A7A]'}`}/></div><span className="text-[10px] font-bold">G{g}</span></div>})}</div></DashPanel><DashPanel title="Eye distribution" subtitle="Screened eyes"><DashBar label="Right eye" value={stats.eyes.R} total={Math.max(cases.length,1)}/><DashBar label="Left eye" value={stats.eyes.L} total={Math.max(cases.length,1)}/><DashBar label="Other / both" value={stats.eyes.both} total={Math.max(cases.length,1)}/><div className="mt-4 pt-3 border-t border-[#E4EDF2] flex justify-between text-xs"><span className="text-[#647887]">Pending review</span><b>{stats.pending}</b></div></DashPanel></section>

            <section className="bg-white border border-[#D8E4EC] rounded-2xl shadow-[0_5px_20px_rgba(15,39,66,.04)] overflow-hidden"><div className="px-5 py-4 border-b border-[#E4EDF2]"><div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.18em] text-[#159A9C] font-bold">Review queue</p><h2 className="text-xl font-bold mt-1">{queueMode==='new'?'New Screenings':'Previous Reviews'}</h2></div><div className="flex flex-wrap gap-2"><button onClick={()=>{setQueueMode('new');setFilter('all')}} className={`px-3 py-2 rounded-lg text-[11px] font-bold border ${queueMode==='new'?'bg-[#D9F3F4] text-[#1E5A7A] border-[#BFDDE5]':'bg-white text-[#647887] border-[#D8E4EC]'}`}>New</button><button onClick={()=>{setQueueMode('previous');setFilter('all')}} className={`px-3 py-2 rounded-lg text-[11px] font-bold border ${queueMode==='previous'?'bg-[#D9F3F4] text-[#1E5A7A] border-[#BFDDE5]':'bg-white text-[#647887] border-[#D8E4EC]'}`}>Previous</button><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient / case" className="w-44 px-3 py-2 rounded-lg border border-[#D8E4EC] bg-[#F4F8FB] text-xs outline-none focus:border-[#36C5D8]"/><select value={filter} onChange={e=>setFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#D8E4EC] bg-white text-xs font-semibold"><option value="all">All</option><option value="pending">Pending</option><option value="reviewed">Reviewed</option><option value="referral">Referral</option></select><button onClick={()=>loadCases(true)} disabled={refreshing} className="px-3 py-2 rounded-lg bg-[#0F2742] text-white text-xs font-bold">{refreshing?'…':'Refresh'}</button></div></div></div>
              {error&&<div className="m-4 rounded-xl bg-[#FCEBEA] border border-[#F2C8C5] p-3 text-xs text-[#D9534F] font-semibold">{error}</div>}
              <div className="overflow-x-auto"><table className="w-full table-fixed"><colgroup><col className="w-[13%]"/><col className="w-[20%]"/><col className="w-[7%]"/><col className="w-[17%]"/><col className="w-[13%]"/><col className="w-[11%]"/><col className="w-[11%]"/><col className="w-[8%]"/></colgroup><thead><tr className="bg-[#F4F8FB] border-b border-[#E4EDF2]"><TH>Case</TH><TH>Patient</TH><TH>Eye</TH><TH>AI Grade</TH><TH>Confidence</TH><TH>Status</TH><TH>Date</TH><TH>Action</TH></tr></thead><tbody>{loading?<tr><td colSpan="8" className="px-5 py-12 text-center text-xs text-[#7A8D9B]">Loading screening cases…</td></tr>:filteredCases.length?filteredCases.map(item=><tr key={item.screeningId} className="border-b border-[#EEF4F7] last:border-0 hover:bg-[#F8FBFC]"><td className="px-3 py-3"><div className="text-xs font-bold text-[#0F2742] truncate">{item.caseId}</div><div className="text-[9px] text-[#7A8D9B] mt-1 truncate">{item.patientCode}</div></td><td className="px-3 py-3"><div className="text-xs font-semibold truncate">{item.patient}</div><div className="text-[10px] text-[#7A8D9B] mt-1 truncate">{item.age} yrs · {item.sex}</div></td><td className="px-3 py-3 text-xs font-bold text-[#647887]">{item.eye}</td><td className="px-3 py-3"><CompactGrade grade={item.grade} classification={item.classification}/></td><td className="px-3 py-3">{item.confidence==null?<span className="text-[10px] text-[#7A8D9B]">Pending</span>:<div className="flex items-center gap-2"><b className="text-xs">{item.confidence}%</b><div className="h-1.5 w-12 rounded-full bg-[#EAF2F5] overflow-hidden"><div className="h-full bg-[#159A9C]" style={{width:`${Math.min(100,item.confidence)}%`}}/></div></div>}</td><td className="px-3 py-3"><StatusBadge status={item.status}/></td><td className="px-3 py-3 text-[10px] text-[#647887] whitespace-nowrap">{item.createdAt?new Date(item.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}</td><td className="px-3 py-3 text-right"><button onClick={()=>onReviewCase(item)} className="px-2.5 py-1.5 rounded-lg bg-[#0F2742] text-white text-[10px] font-bold hover:bg-[#1E5A7A]">Review</button></td></tr>):<tr><td colSpan="8" className="px-5 py-12 text-center"><div className="text-sm font-bold text-[#172B3A]">No cases found</div><div className="text-[11px] text-[#7A8D9B] mt-1">Try another filter or refresh the queue.</div></td></tr>}</tbody></table></div></section>
            <div className="mt-3 flex justify-between text-[10px] text-[#7A8D9B]"><span>Showing {filteredCases.length} {queueMode==='new'?'new':'previous'} case{filteredCases.length===1?'':'s'}.</span><span>AI output is a screening aid; final clinical disposition remains with the ophthalmologist.</span></div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SideItem({label,icon,active,onClick}){return <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold mb-1 ${active?'bg-[#1E5A7A] text-white':'text-[#DCEAF1] hover:bg-white/[0.08]'}`}><span className="w-5 text-center">{icon}</span>{label}</button>}
function DashStat({label,value,note,tone}){const c={blue:'bg-[#E7F4FA] text-[#1E5A7A]',green:'bg-[#E8F7F0] text-[#168553]',red:'bg-[#FCEBEA] text-[#D9534F]',navy:'bg-[#EEF4F7] text-[#0F2742]'}[tone]||'bg-[#EEF4F7] text-[#0F2742]';return <div className="bg-white border border-[#D8E4EC] rounded-2xl p-4 shadow-[0_4px_16px_rgba(15,39,66,.035)]"><div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${c}`}>+</div><div className="text-[11px] text-[#647887] mt-3">{label}</div><div className="text-2xl font-bold text-[#0F2742] mt-1">{value}</div><div className="text-[9px] text-[#7A8D9B] mt-1">{note}</div></div>}
function DashPanel({title,subtitle,children}){return <div className="bg-white border border-[#D8E4EC] rounded-2xl shadow-[0_5px_20px_rgba(15,39,66,.04)] p-4"><h3 className="text-sm font-bold text-[#172B3A]">{title}</h3><p className="text-[10px] text-[#7A8D9B] mt-1">{subtitle}</p>{children}</div>}
function DashBar({label,value,total}){const p=total?Math.round(value/total*100):0;return <div className="mt-4"><div className="flex justify-between text-[10px] mb-1"><span className="text-[#647887] font-semibold">{label}</span><b>{value} <span className="text-[#9AAAB5]">({p}%)</span></b></div><div className="h-2 rounded-full bg-[#EAF2F5] overflow-hidden"><div className="h-full bg-[#159A9C] rounded-full" style={{width:`${Math.min(100,p)}%`}}/></div></div>}
function CompactGrade({grade,classification}){if(grade==null)return <span className="text-[10px] text-[#7A8D9B]">Pending</span>;const critical=grade>=2;return <span title={classification} className={`inline-flex max-w-full px-2 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap overflow-hidden text-ellipsis ${critical?'bg-[#FCEBEA] text-[#D9534F] border-[#F2C8C5]':'bg-[#E8F7F0] text-[#168553] border-[#CBEAD9]'}`}>G{grade} · {grade===0?'No DR':grade===1?'Mild NPDR':grade===2?'Moderate NPDR':grade===3?'Severe NPDR':'PDR'}</span>}
function StatusBadge({status}){const c=status==='Reviewed'?'bg-[#E8F7F0] text-[#168553] border-[#CBEAD9]':status==='Referred'?'bg-[#FCEBEA] text-[#D9534F] border-[#F2C8C5]':'bg-[#D9F3F4] text-[#1E5A7A] border-[#BFDDE5]';return <span className={`inline-flex px-2 py-1 rounded-full border text-[9px] font-bold ${c}`}>{status}</span>}
function TH({children}){return <th className="px-3 py-3 text-left text-[9px] uppercase tracking-[.12em] text-[#7A8D9B] font-bold">{children}</th>}
function DoctorUtilityPage({page,session,onBack,onLogout}){const title=page==='settings'?'Doctor Settings':'Help & Guidance';return <div className="min-h-screen bg-[#F4F8FB] text-[#172B3A]"><header className="h-[76px] bg-white border-b border-[#D8E4EC] flex items-center justify-between px-5 sm:px-8"><RetinovaLogo compact/><button onClick={onBack} className="px-4 py-2 rounded-xl border border-[#D8E4EC] text-xs font-bold">Back to dashboard</button></header><main className="max-w-5xl mx-auto p-6 sm:p-10"><p className="text-[10px] uppercase tracking-[.2em] text-[#159A9C] font-bold">Clinical workspace</p><h1 className="text-3xl font-bold mt-2">{title}</h1>{page==='settings'?<div className="grid md:grid-cols-2 gap-4 mt-6"><UtilityCard title="Doctor profile"><p>Username: <b>{session?.username||'doctor001'}</b></p><p>Role: <b>Ophthalmologist</b></p><p>Workspace: <b>Retinova clinical review</b></p></UtilityCard><UtilityCard title="System"><p>AI model: <b>Online</b></p><p>Database: <b>Connected</b></p><p>Final clinical decision: <b>Human reviewer</b></p></UtilityCard></div>:<div className="grid md:grid-cols-2 gap-4 mt-6"><UtilityCard title="Case review"><p>Inspect fundus evidence, Grad-CAM, AI grade, confidence and clinical findings before recording a decision.</p></UtilityCard><UtilityCard title="Clinical safety"><p>AI output is a screening aid and does not replace ophthalmologist assessment.</p></UtilityCard></div>}<button onClick={onLogout} className="mt-7 text-sm font-bold text-[#D9534F]">Sign out</button></main></div>}
function UtilityCard({title,children}){return <div className="bg-white border border-[#D8E4EC] rounded-2xl p-5 shadow-sm"><h3 className="font-bold">{title}</h3><div className="mt-3 space-y-2 text-sm text-[#647887] leading-relaxed">{children}</div></div>}

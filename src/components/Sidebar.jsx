import {
  LayoutDashboard,
  ScanEye,
  Users,
  FileText,
  Activity,
  Settings,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "New Screening", icon: ScanEye },
  { name: "Patients", icon: Users },
  { name: "Reports", icon: FileText },
  { name: "System Status", icon: Activity },
  { name: "Settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col">

      {/* Logo */}
      <div className="h-20 px-6 flex items-center border-b border-slate-200">
        <div className="flex items-center gap-3">

          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
            <ScanEye className="w-5 h-5 text-white" />
          </div>

          <div>
            <h1 className="font-bold text-slate-900">
              RetinaSafe
            </h1>

            <p className="text-xs text-slate-500">
              AI Screening
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">

        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <Icon className="w-5 h-5" />

              <span className="text-sm font-medium">
                {item.name}
              </span>
            </button>
          );
        })}

      </nav>

      {/* System status */}
      <div className="p-4">

        <div className="rounded-xl bg-slate-50 p-4">

          <p className="text-xs text-slate-500">
            System Status
          </p>

          <div className="flex items-center gap-2 mt-2">

            <span className="w-2 h-2 rounded-full bg-green-500" />

            <span className="text-sm font-medium text-slate-700">
              All systems ready
            </span>

          </div>

        </div>

      </div>

    </aside>
  );
}

export default Sidebar;
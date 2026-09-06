import { Bell, UserCircle } from "lucide-react";

function Navbar() {
  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8">

      <div>
        <p className="text-sm text-slate-500">
          Rural Health Screening
        </p>

        <h2 className="text-xl font-semibold text-slate-900">
          Screening Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-5">

        <button className="relative p-2 rounded-lg hover:bg-slate-100 transition">
          <Bell className="w-5 h-5 text-slate-600" />

          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3">

          <UserCircle className="w-9 h-9 text-slate-400" />

          <div>
            <p className="text-sm font-medium text-slate-800">
              PHC Operator
            </p>

            <p className="text-xs text-slate-500">
              Screening Station
            </p>
          </div>

        </div>

      </div>

    </header>
  );
}

export default Navbar;
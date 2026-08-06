import { LoaderCircle } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="grid min-h-[55vh] place-items-center">
      <div className="flex max-w-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center text-sm font-bold text-slate-600 shadow-sm sm:flex-row sm:gap-3 sm:px-5 sm:text-left">
        <LoaderCircle className="animate-spin text-sky-700" size={20} /> Loading administration workspace
      </div>
    </div>
  );
}

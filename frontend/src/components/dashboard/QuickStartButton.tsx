import { ArrowRight, Play } from "lucide-react";
import { useState } from "react";
import QuickStartModal from "./QuickStartModal";

export default function QuickStartButton() {
  const [open, setOpen] = useState(false);

  return (
    <section className="flex justify-center">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full max-w-[400px] items-center justify-between gap-4 rounded-card bg-cyan px-8 py-4 text-white shadow-sm transition hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60"
      >
        <Play size={20} />
        <span className="text-lg font-bold">Start Study Session</span>
        <ArrowRight size={20} />
      </button>
      <QuickStartModal open={open} onOpenChange={setOpen} />
    </section>
  );
}

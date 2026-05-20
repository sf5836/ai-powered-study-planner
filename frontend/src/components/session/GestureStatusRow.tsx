import { Eye, EyeOff, Smartphone, UserX, Wind } from "lucide-react";
import type { GestureFlags } from "../../stores/sessionStore";

type GestureStatusRowProps = {
  flags: GestureFlags;
};

export default function GestureStatusRow({ flags }: GestureStatusRowProps) {
  const items = [
    { key: "lookingAway", label: "Looking Away", active: flags.lookingAway, icon: EyeOff },
    { key: "eyesClosed", label: "Eyes Closed", active: flags.eyesClosed, icon: Eye },
    { key: "yawning", label: "Yawning", active: flags.yawning, icon: Wind },
    { key: "slouching", label: "Slouching", active: flags.slouching, icon: UserX },
    { key: "phoneDetected", label: "Phone", active: flags.phoneDetected, icon: Smartphone },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.key}
            className={[
              "inline-flex min-w-[92px] flex-col items-center gap-1 rounded-card px-3 py-2 text-center transition",
              item.active
                ? "bg-cyan text-white"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300",
            ].join(" ")}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

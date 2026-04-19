export default function PageLoadingSpinner() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-lightBg dark:bg-[#0D1B40]">
      <svg className="h-12 w-12 animate-spin" viewBox="0 0 48 48" role="img" aria-label="Loading">
        <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(0, 194, 203, 0.2)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="none"
          stroke="#00C2CB"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="90"
          strokeDashoffset="20"
        />
      </svg>
      <p className="mt-3 text-sm text-gray-500 dark:text-gray-300">Loading…</p>
    </div>
  );
}

export function AppVersion() {
  return (
    <span
      className="fixed bottom-1.5 right-2 z-40 pointer-events-none select-none text-[10px] font-medium text-zinc-600/70"
      aria-label={`Version ${__APP_VERSION__}`}
    >
      v{__APP_VERSION__}
    </span>
  )
}

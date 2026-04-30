export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-5 px-6 py-7 rounded-2xl bg-card border border-border shadow-sm animate-fade-in">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="block h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="block h-2.5 w-2.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="block h-2.5 w-2.5 rounded-full bg-primary animate-bounce" />
        </div>
        <p className="text-[13px] font-medium text-foreground tracking-wide">
          Loading dashboard
        </p>
      </div>
    </div>
  );
}

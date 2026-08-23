export default function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-brand-pink bg-brand-pink/10 px-4 py-3 text-sm text-brand-pink shadow-neon-pink-soft" role="alert">
      {message}
    </div>
  );
}

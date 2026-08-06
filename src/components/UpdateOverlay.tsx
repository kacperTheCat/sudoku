export function UpdateOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="update-overlay" role="status" aria-live="polite" aria-label="Aktualizowanie aplikacji">
      <div className="update-spinner" />
    </div>
  );
}

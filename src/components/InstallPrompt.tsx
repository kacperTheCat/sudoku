interface InstallPromptProps {
  visible: boolean;
  iOS: boolean;
  canInstall: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallPrompt({ visible, iOS, canInstall, onInstall, onDismiss }: InstallPromptProps) {
  if (!visible) return null;

  return (
    <div className="install-overlay" role="dialog" aria-modal="true" aria-label="Zainstaluj aplikację">
      <div className="install-dialog">
        <h2>Zainstaluj Sudoku</h2>
        {iOS ? (
          <p className="install-dialog__text">
            Dotknij ikonę <strong>Udostępnij</strong> na pasku Safari, a potem wybierz{' '}
            <strong>„Dodaj do ekranu głównego”</strong> — będziesz mieć grę jak natywną aplikację, także offline.
          </p>
        ) : (
          <p className="install-dialog__text">
            Dodaj grę do ekranu głównego, żeby uruchamiać ją jak natywną aplikację i grać offline.
          </p>
        )}
        <div className="install-dialog__actions">
          {!iOS && canInstall && (
            <button type="button" className="button button--primary" data-sound="transition" onClick={onInstall}>
              Zainstaluj
            </button>
          )}
          <button type="button" className="button" onClick={onDismiss}>
            {iOS ? 'Rozumiem' : 'Nie teraz'}
          </button>
        </div>
      </div>
    </div>
  );
}

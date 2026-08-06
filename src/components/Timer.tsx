function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function Timer({ seconds }: { seconds: number }) {
  return <span className="timer">{formatTime(seconds)}</span>;
}

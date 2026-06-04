export default function Crosshair({ className }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--ink-3)" strokeWidth="1">
      <path d="M0 0 H 6 M 0 0 V 6" />
    </svg>
  );
}

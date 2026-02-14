export default function PortalTransition({ active, direction = "enter", animationKey, reducedMotion }) {
  if (!active) return null;

  if (reducedMotion) {
    return (
      <div key={animationKey} className="portal-overlay portal-overlay--reduced" aria-hidden="true">
        <div className="portal-overlay__backdrop" />
      </div>
    );
  }

  return (
    <div key={animationKey} className={`portal-overlay portal-overlay--${direction}`} aria-hidden="true">
      <div className="portal-overlay__backdrop" />
      <div className="portal-overlay__core" />
      <div className="portal-overlay__sweep" />
    </div>
  );
}

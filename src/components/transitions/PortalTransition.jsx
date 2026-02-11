const STREAK_COUNT = 18;

export default function PortalTransition({ active, direction = "enter", animationKey, reducedMotion }) {
  if (!active) return null;

  if (reducedMotion) {
    return (
      <div key={animationKey} className="portal-overlay portal-overlay--reduced" aria-hidden="true">
        <div className="portal-overlay__veil" />
      </div>
    );
  }

  return (
    <div key={animationKey} className={`portal-overlay portal-overlay--${direction}`} aria-hidden="true">
      <div className="portal-overlay__veil" />
      <div className="portal-overlay__ring portal-overlay__ring--outer" />
      <div className="portal-overlay__ring portal-overlay__ring--inner" />
      <div className="portal-overlay__pulse" />
      <div className="portal-overlay__flash" />

      <div className="portal-overlay__streaks">
        {Array.from({ length: STREAK_COUNT }).map((_, index) => (
          <span key={index} style={{ "--index": index }} />
        ))}
      </div>
    </div>
  );
}

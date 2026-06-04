// Eyebrow meta line + display title + optional sub/right slot.
export default function PageHead({ eyebrow, title, sub, right }) {
  return (
    <div className="page__head fade-in">
      <div className="metaline">
        <span className="mono-uppr marker">●</span>
        <span className="mono-uppr">{eyebrow}</span>
        <span className="sep mono-uppr">/</span>
        <span className="mono-uppr">{new Date().toISOString().slice(0, 10)}</span>
      </div>
      <div className="page__head__row">
        <h1 className="page__title">{title}</h1>
        {right ? <div className="page__head__right">{right}</div> : null}
      </div>
      {sub ? <p className="page__sub">{sub}</p> : null}
    </div>
  );
}

import { useEffect, useState } from "react";
import { CONTENT } from "../content/site.js";

export default function Footer({ locale }) {
  const c = CONTENT.footer[locale] ?? CONTENT.footer.es;
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const t = now.toISOString().split("T")[1].split(".")[0];

  return (
    <div className="container">
      <footer className="footer">
        <div className="footer__row">
          <span>{c.line}</span>
          <span>
            <span className="accent">●</span> {c.op} · UTC {t}
          </span>
        </div>
      </footer>
    </div>
  );
}

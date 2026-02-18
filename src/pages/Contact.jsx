import { Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell.jsx";
import { getPath } from "../app/paths.js";

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path
        fill="currentColor"
        d="M20.523 3.477A11.789 11.789 0 0 0 12.088.5C5.67.5.44 5.73.44 12.148a11.6 11.6 0 0 0 1.53 5.77L.333 23.5l5.734-1.503a11.63 11.63 0 0 0 6.02 1.66h.005c6.418 0 11.647-5.23 11.647-11.648a11.56 11.56 0 0 0-3.216-8.532ZM12.09 21.66h-.004a9.66 9.66 0 0 1-4.925-1.348l-.352-.21-3.402.892.907-3.318-.228-.341a9.66 9.66 0 0 1-1.478-5.184c0-5.236 4.258-9.494 9.493-9.494a9.43 9.43 0 0 1 6.747 2.797 9.44 9.44 0 0 1 2.803 6.74c0 5.237-4.258 9.466-9.56 9.466Zm5.296-7.219c-.289-.145-1.732-.853-1.999-.95-.266-.096-.46-.144-.654.145-.192.29-.746.95-.914 1.143-.17.193-.338.217-.627.072-.289-.145-1.218-.45-2.322-1.435-.86-.766-1.441-1.713-1.609-2.002-.169-.29-.018-.446.127-.59.13-.129.289-.338.434-.507.145-.168.193-.289.29-.482.096-.193.048-.362-.025-.507-.072-.145-.651-1.568-.892-2.145-.236-.567-.476-.49-.654-.5l-.557-.01c-.193 0-.507.072-.772.362-.266.289-1.014.99-1.014 2.413 0 1.423 1.038 2.798 1.183 2.99.145.194 2.044 3.123 4.95 4.379.691.299 1.229.477 1.648.61.693.22 1.324.189 1.823.114.556-.083 1.731-.707 1.974-1.39.241-.684.241-1.271.168-1.39-.072-.121-.266-.194-.555-.338Z"
      />
    </svg>
  );
}

const CONTACT_INFO = {
  email: "info@korabysela.dev",
  linkedin: "https://www.linkedin.com/in/josep99/",
  whatsapp: "https://wa.me/573505550445",
  whatsappDisplay: "+57 350 555 0445",
};

const CONTACT_COPY = {
  es: {
    title: "Contacto",
    subtitle: "Cuéntame qué necesitas y te respondo con una propuesta clara.",
    emailLabel: "Correo",
    responseLabel: "Tiempo de respuesta",
    responseValue: "Normalmente en menos de 24 horas.",
    scopeLabel: "Cobertura",
    scopeValue: "Remoto para Colombia, LATAM y clientes internacionales.",
    linkedinLabel: "LinkedIn",
    linkedinValue: "Perfil profesional y trayectoria.",
    whatsappLabel: "WhatsApp",
    whatsappValue: "Canal directo para consultas rápidas.",
    ctaMail: "Escribir por correo",
    ctaProjects: "Ver proyectos",
    ctaLinkedIn: "LinkedIn",
    ctaWhatsApp: "WhatsApp",
    whatsappPrefill:
      "Hola Jose, vi tu portafolio en Kora by Sela y me gustaria hablar sobre un proyecto web. Te comparto un poco de contexto:",
  },
  en: {
    title: "Contact",
    subtitle: "Tell me what you need and I will reply with a clear proposal.",
    emailLabel: "Email",
    responseLabel: "Response time",
    responseValue: "Usually within 24 hours.",
    scopeLabel: "Coverage",
    scopeValue: "Remote for Colombia, LATAM, and international clients.",
    linkedinLabel: "LinkedIn",
    linkedinValue: "Professional profile and background.",
    whatsappLabel: "WhatsApp",
    whatsappValue: "Direct channel for quick questions.",
    ctaMail: "Email me",
    ctaProjects: "View projects",
    ctaLinkedIn: "LinkedIn",
    ctaWhatsApp: "WhatsApp",
    whatsappPrefill:
      "Hi Jose, I found your Kora by Sela portfolio and would like to discuss a web project. Here is some initial context:",
  },
};

export default function Contact({ locale }) {
  const copy = CONTACT_COPY[locale] ?? CONTACT_COPY.es;
  const projectsPath = getPath("projects", locale);
  const whatsappHref = `${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(copy.whatsappPrefill)}`;

  return (
    <PageShell title={copy.title} subtitle={copy.subtitle}>
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{copy.emailLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{CONTACT_INFO.email}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.responseLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.responseValue}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.scopeLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>{copy.scopeValue}</div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.linkedinLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              {copy.linkedinValue} -{" "}
              <a href={CONTACT_INFO.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                {CONTACT_INFO.linkedin}
              </a>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>{copy.whatsappLabel}</div>
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              {copy.whatsappValue} -{" "}
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                {CONTACT_INFO.whatsappDisplay}
              </a>
            </div>
          </div>
        </div>

        <div style={{ height: 14 }} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href={`mailto:${CONTACT_INFO.email}`}>
            {copy.ctaMail}
          </a>
          <a
            className="btn"
            href={CONTACT_INFO.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#0A66C2",
              borderColor: "#0A66C2",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Linkedin size={16} strokeWidth={2.2} aria-hidden="true" />
            {copy.ctaLinkedIn}
          </a>
          <a
            className="btn"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#25D366",
              borderColor: "#25D366",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <WhatsAppIcon width={16} height={16} aria-hidden="true" />
            {copy.ctaWhatsApp}
          </a>
          <Link className="btn btn-ghost" to={projectsPath}>
            {copy.ctaProjects}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

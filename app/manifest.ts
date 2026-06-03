import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bocsa — Betrieb & PKW-Service",
    short_name: "Bocsa",
    description: "Baumaschinen, Lager, PKW-Werkstatt und Kunden-Terminbuchung.",
    start_url: "/start",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#ea580c",
    lang: "de",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icons/bocsa-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/bocsa-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "PKW Termin (Kunde)",
        short_name: "Termin",
        url: "/pkw/buchen",
        description: "Termin mit Kennzeichen und PIN buchen",
      },
      {
        name: "Mitarbeiter Login",
        short_name: "Login",
        url: "/login",
        description: "Anmeldung für Werkstatt und Lager",
      },
    ],
  };
}

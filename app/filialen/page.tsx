import AppPageShell from "../components/AppPageShell";

export default function FilialenPage() {
  return (
    <AppPageShell activeHref="/filialen" subtitle="Üzemeltetés">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>Filialen</h1>
          <p>Ez a lap a Filialen menüponthoz tartozik.</p>
          <a className="backButton" href="/">
            Vissza az üdvözlő oldalra
          </a>
        </div>
      </div>
    </AppPageShell>
  );
}

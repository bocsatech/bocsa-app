// app/page.tsx

import SupabaseTable from "../components/SupabaseTable";
import styles from './page.module.css';

export default function Page() {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>BOCSA TECH</h2>
        <nav>
          <ul>
            <li><a href="#arbeitsprotokol">Arbeitsprotokol</a></li>
            <li><a href="#lager">Lager</a></li>
            <li><a href="#ersatzteile">Ersatzteile</a></li>
            <li><a href="#arbeitsstunden">Arbeitsstunden</a></li>
            <li><a href="#filiale">Filiale</a></li>
            <li><a href="#pruefprotokol">Prüfprotokol</a></li>
            <li><a href="#alle-gerate">Alle Geräte</a></li> {/* Új menüpont */}
            <li><a href="#qr-scanen">QR scannen</a></li> {/* Új menüpont */}
          </ul>
        </nav>
      </aside>
      <main className={styles.main}>
        <h1>WILLKOMMEN</h1>
        <p>Wählen Sie eine Kategorie aus:</p>
        <div className={styles.categories}>
          <div className={styles.category}>
            <h3>Kleingeräte</h3>
            <img src="/icons/saw-icon.png" alt="Saw Icon" />
          </div>
          <div className={styles.category}>
            <h3>Großgeräte</h3>
            <img src="/icons/tractor-icon.png" alt="Tractor Icon" />
          </div>
          <div className={styles.category}>
            <h3>Elektrogeräte 230</h3>
            <img src="/icons/electrical-icon-230.png" alt="Electrical Devices 230" />
          </div>
          <div className={styles.category}>
            <h3>Elektrogeräte 400</h3>
            <img src="/icons/electrical-icon-400.png" alt="Electrical Devices 400" />
          </div>
          <div className={styles.category}>
            <h3>PKW</h3>
            <img src="/icons/car-icon.png" alt="Car Icon" />
          </div>
        </div>
        <SupabaseTable
          table="arbeitsprotokol"
          title="Arbeitsprotokol"
        />
      </main>
    </div>
  );
}

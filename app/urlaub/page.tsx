import { listUsers } from "../../lib/auth/users";
import { attachBlocksToUrlaubUsers, isMissingUrlaubTablesError } from "../../lib/urlaub-db";
import { mapDbUsersToUrlaubTimelineUsers, type UrlaubTimelineUser } from "../../lib/urlaub-timeline-users";
import { getSupabaseAdmin } from "../../lib/supabaseAdmin";
import AppPageShell from "../components/AppPageShell";
import UrlaubHorizCalendar from "./UrlaubHorizCalendar";
import "./urlaub.css";

async function loadInitialUrlaubUsers(): Promise<UrlaubTimelineUser[]> {
  const { users, error } = await listUsers();
  if (error) return [];
  const baseUsers = mapDbUsersToUrlaubTimelineUsers(users ?? []);
  const db = getSupabaseAdmin();
  if (!db) return baseUsers;

  const { data, error: urlaubError } = await db.from("urlaub_tage").select("username, datum, variant");
  if (urlaubError) {
    if (isMissingUrlaubTablesError(urlaubError)) return baseUsers;
    return baseUsers;
  }

  return attachBlocksToUrlaubUsers(baseUsers, data ?? []);
}

export default async function UrlaubPage() {
  const initialUsers = await loadInitialUrlaubUsers();

  return (
    <AppPageShell activeHref="/urlaub" subtitle="Betrieb">
      <div className="urlaubPage">
        <header className="urlaubPageHeader">
          <h1>Urlaub</h1>
        </header>
        <UrlaubHorizCalendar initialUsers={initialUsers} />
      </div>
    </AppPageShell>
  );
}

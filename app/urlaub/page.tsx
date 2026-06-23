import { listUsers } from "../../lib/auth/users";
import { mapDbUsersToUrlaubTimelineUsers, type UrlaubTimelineUser } from "../../lib/urlaub-timeline-users";
import AppPageShell from "../components/AppPageShell";
import UrlaubHorizCalendar from "./UrlaubHorizCalendar";
import "./urlaub.css";

export default async function UrlaubPage() {
  const { users, error } = await listUsers();
  const initialUsers: UrlaubTimelineUser[] = error ? [] : mapDbUsersToUrlaubTimelineUsers(users ?? []);

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

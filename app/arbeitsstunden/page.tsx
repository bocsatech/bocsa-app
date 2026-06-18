import { listUsers } from "../../lib/auth/users";
import { mapDbUsersToTimelineUsers } from "../../lib/arbeitsstunden-timeline-users";
import ArbeitsstundenTimeline from "./ArbeitsstundenTimeline";

export default async function ArbeitsstundenPage() {
  const { users, error } = await listUsers();
  const initialUsers = error ? [] : mapDbUsersToTimelineUsers(users ?? []);

  return <ArbeitsstundenTimeline initialUsers={initialUsers} />;
}

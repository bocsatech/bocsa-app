import SupabaseTable from "../components/SupabaseTable";

export default function Page() {
  return (
    <SupabaseTable
      table="users"
      title="Users"
    />
  );
}

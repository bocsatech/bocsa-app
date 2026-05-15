import SupabaseTable from "../components/SupabaseTable";

export default function Page() {
  return (
    <SupabaseTable
      table="arbeitsstunden"
      title="Arbeitsstunden"
    />
  );
}

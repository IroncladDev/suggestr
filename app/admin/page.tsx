import { cookies } from "next/headers";
import AdminLogin from "./login";
import AdminContent from "./content";
import { fetchSuggestions } from "../server/actions";

export default async function AdminPage() {
  const cookie = await cookies();
  const session = cookie.get("admin_session");

  const isSessionValid = session && Date.now() < Number(session.value);

  if (!isSessionValid) {
    return <AdminLogin />;
  }

  const pendingSuggestions = await fetchSuggestions();

  return <AdminContent suggestions={pendingSuggestions} />;
}

export const dynamic = "force-dynamic";

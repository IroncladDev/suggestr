import { cookies } from "next/headers";
import AdminLogin from "./login";

export default async function AdminPage() {
  const cookie = await cookies();
  const session = cookie.get("admin_session");

  const isSessionValid = session && Date.now() < Number(session.value);

  if (isSessionValid) {
    return <div>Has session</div>;
  }

  return <AdminLogin />;
}

export const dynamic = "force-dynamic";

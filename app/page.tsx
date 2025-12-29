import { redirect } from "next/navigation";
import { getGateSession } from "./lib/auth/session";

export default async function Page() {
  const session = await getGateSession();

  if (!session.isAuthenticated) {
    redirect("/gate");
  }

  // Bootstrap mode should stay on admin panel
  if (session.isBootstrap) {
    redirect("/admin/access?bootstrap=1");
  }

  redirect("/calculator");
}

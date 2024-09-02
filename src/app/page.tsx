import ClientHome from "~/components/clientHome";
import { apiS, HydrateClient } from "~/trpc/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { loginRequired } = await apiS.user.checkLoginState();

  return <HydrateClient><ClientHome initialLoginState={!loginRequired} /></HydrateClient>;
}
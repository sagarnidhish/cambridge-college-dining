import { createDashboardSession } from "./app/dashboard-session";
import { mountDashboard } from "./ui/mount";

const root = document.querySelector<HTMLElement>("#app");
if (root === null) {
  throw new Error("Dashboard root is missing.");
}

const session = createDashboardSession({
  fetchImpl: window.fetch.bind(window),
  storage: window.localStorage,
  now: () => new Date()
});

void mountDashboard(root, session, () => new Date());

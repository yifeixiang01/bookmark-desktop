import { authRouter } from "./auth-router";
import { emailAuthRouter } from "./email-auth-router";
import { stateRouter } from "./state-router";
import { siteMetaRouter } from "./site-meta-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  emailAuth: emailAuthRouter,
  state: stateRouter,
  siteMeta: siteMetaRouter,
});

export type AppRouter = typeof appRouter;

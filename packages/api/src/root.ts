import { authRouter } from "./router/auth";
import { numberRouter } from "./router/number";
import { postRouter } from "./router/post";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  number: numberRouter,
  post: postRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

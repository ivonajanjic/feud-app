import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { desc, eq } from "@acme/db";
import { CreatePostSchema, Post } from "@acme/db/schema";

import { protectedProcedure, publicProcedure } from "../trpc";

// Mock data for when database is not configured
const mockPosts = [
  { id: "1", title: "Welcome to T3 Turbo", content: "This is a demo post. Configure a database to enable full functionality." },
  { id: "2", title: "Getting Started", content: "Edit the code in apps/nextjs to customize your app." },
];

export const postRouter = {
  all: publicProcedure.query(({ ctx }) => {
    if (!ctx.db) {
      return mockPosts;
    }
    return ctx.db.query.Post.findMany({
      orderBy: desc(Post.id),
      limit: 10,
    });
  }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => {
      if (!ctx.db) {
        return mockPosts.find((p) => p.id === input.id) ?? null;
      }
      return ctx.db.query.Post.findFirst({
        where: eq(Post.id, input.id),
      });
    }),

  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(({ ctx, input }) => {
      if (!ctx.db) {
        return { id: String(Date.now()), ...input };
      }
      return ctx.db.insert(Post).values(input);
    }),

  delete: protectedProcedure.input(z.string()).mutation(({ ctx, input }) => {
    if (!ctx.db) {
      return { deleted: true };
    }
    return ctx.db.delete(Post).where(eq(Post.id, input));
  }),
} satisfies TRPCRouterRecord;

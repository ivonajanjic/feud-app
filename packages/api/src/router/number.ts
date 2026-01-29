import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import * as fs from "fs";
import * as path from "path";

import { publicProcedure } from "../trpc";

// Store number.json at the monorepo root for simplicity
function getDataFilePath(): string {
  // Find the monorepo root by looking for pnpm-workspace.yaml
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return path.join(dir, "number-data.json");
    }
    dir = path.dirname(dir);
  }
  // Fallback to current directory
  return path.join(process.cwd(), "number-data.json");
}

interface NumberData {
  value: number;
}

function readNumber(): number {
  try {
    const filePath = getDataFilePath();
    console.log("[number-router] Reading from:", filePath);
    if (!fs.existsSync(filePath)) {
      console.log("[number-router] File does not exist, returning 0");
      return 0;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as NumberData;
    return parsed.value;
  } catch (err) {
    console.error("[number-router] Error reading number:", err);
    return 0;
  }
}

function writeNumber(value: number): void {
  const filePath = getDataFilePath();
  console.log("[number-router] Writing to:", filePath, "value:", value);
  try {
    const data: NumberData = { value };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log("[number-router] Write successful");
  } catch (err) {
    console.error("[number-router] Error writing number:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to write number: ${err instanceof Error ? err.message : "Unknown error"}`,
    });
  }
}

export const numberRouter = {
  get: publicProcedure.query(() => {
    return { value: readNumber() };
  }),

  set: publicProcedure
    .input(z.object({ value: z.number() }))
    .mutation(({ input }) => {
      writeNumber(input.value);
      return { value: input.value };
    }),
} satisfies TRPCRouterRecord;

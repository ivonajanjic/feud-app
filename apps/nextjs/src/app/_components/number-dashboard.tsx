"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import { useTRPC } from "~/trpc/react";

export function NumberDashboard() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [inputValue, setInputValue] = useState("");

  const { data, isLoading } = useQuery(trpc.number.get.queryOptions());

  const setNumber = useMutation(
    trpc.number.set.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.number.pathFilter());
        toast.success("Number updated!");
      },
      onError: (err) => {
        console.error("Error setting number:", err);
        toast.error(err.message || "Failed to update number");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(inputValue);
    if (isNaN(num)) {
      toast.error("Please enter a valid number");
      return;
    }
    setNumber.mutate({ value: num });
  };

  return (
    <div className="bg-muted w-full max-w-md rounded-lg p-6">
      <h2 className="text-primary mb-4 text-2xl font-bold">Number Dashboard</h2>

      <div className="mb-6 text-center">
        <p className="text-muted-foreground text-sm">Current Value</p>
        <p className="text-primary text-6xl font-bold">
          {isLoading ? "..." : (data?.value ?? 0)}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter a number"
          className="flex-1"
        />
        <Button type="submit" disabled={setNumber.isPending}>
          {setNumber.isPending ? "Updating..." : "Set"}
        </Button>
      </form>
    </div>
  );
}

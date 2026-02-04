"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = password.length > 0 && confirmation === "DELETE MY ACCOUNT";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });

      const data = await response.json();

      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error || "Failed to delete account");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-400">Delete Account</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This action is permanent and cannot be undone
        </p>
      </div>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <CardTitle>Confirm Account Deletion</CardTitle>
          <CardDescription>
            All your data including progress, notes, and bookmarks will be permanently deleted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Enter your password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
              </Label>
              <Input
                id="confirmation"
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                required
                disabled={isDeleting}
              />
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/profile">Cancel</Link>
              </Button>
              <Button type="submit" variant="destructive" disabled={!isValid || isDeleting}>
                {isDeleting ? "Deleting..." : "Delete My Account"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

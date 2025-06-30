"use client";

import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Form } from "@/components/ui/form";
import FormField from "@/components/FormField";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const INTERVIEW_TYPES = [
  { label: "Technical", value: "technical" },
  { label: "Behavioral", value: "behavioral" },
];

const LEVELS = [
  "Intern", "Junior", "Mid", "Senior", "Lead", "Manager"
];

export default function ManualInterviewForm({ userId }: { userId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      role: "",
      type: "technical",
      level: "Junior",
      amount: 5,
      techstack: "",
    },
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vapi/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userid: userId }),
      });
      const result = await res.json();
      if (result.success && result.id) {
        router.push(`/interview/${result.id}`);
      } else {
        setError(result.error || "Failed to generate interview");
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="card-border lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10">
          <h3 className="text-center font-bold text-2xl">Generate Your Custom Interview</h3>
          <p className="text-gray-300 text-base text-center mb-4">Fill in the details below to generate a tailored interview for your role and tech stack.</p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="w-full space-y-6 mt-4 form"
            >
              <FormField
                control={form.control}
                name="role"
                label="Role"
                placeholder="e.g. Frontend Developer"
              />
              <div>
                <label className="label text-white mb-1">Type</label>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full rounded-full bg-black/40 border border-gray-700 text-white focus:ring-2 focus:ring-primary focus:border-primary h-12 px-4">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVIEW_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <label className="label text-white mb-1">Level</label>
                <Controller
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full rounded-full bg-black/40 border border-gray-700 text-white focus:ring-2 focus:ring-primary focus:border-primary h-12 px-4">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="amount"
                label="Number of Questions"
                placeholder="5"
                type="text"
              />
              <FormField
                control={form.control}
                name="techstack"
                label="Tech Stack"
                placeholder="e.g. React, Node.js, MongoDB"
              />
              {error && <div className="text-red-500 text-sm text-center">{error}</div>}
              <Button className="btn" type="submit" disabled={loading}>
                {loading ? "Generating..." : "Generate Interview"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
} 
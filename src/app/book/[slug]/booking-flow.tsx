"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronLeft, Loader2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createPendingBooking } from "./actions";
import type { DayDTO, ServiceSlotsResult, SlotDTO } from "@/lib/booking-data";

const formSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  phone: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  service: {
    slug: string;
    title: string;
    durationMinutes: number;
    priceLabel: string | null;
  };
  data: ServiceSlotsResult | null;
}

type Step = "select" | "details" | "done";

function ContactFallback({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-6 md:p-8">
      <p className="text-base text-foreground/80">{message}</p>
      <Link
        href="/contact"
        className={`${buttonVariants({ size: "lg" })} mt-6 px-6`}
      >
        Contact us
      </Link>
    </div>
  );
}

export function BookingFlow({ service, data }: Props) {
  const days = data?.days ?? [];
  const [step, setStep] = useState<Step>("select");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    days[0]?.dateKey ?? null,
  );
  const [selectedSlot, setSelectedSlot] = useState<SlotDTO | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });

  if (!data) {
    return (
      <ContactFallback message="Online booking isn't set up for this service yet. Get in touch and we'll book you in." />
    );
  }
  if (days.length === 0) {
    return (
      <ContactFallback message="There are no open times in the next 30 days. Please check back soon or contact us to find a time." />
    );
  }

  const selectedDay: DayDTO | undefined =
    days.find((d) => d.dateKey === selectedDateKey) ?? days[0];

  async function onSubmit(values: FormValues) {
    if (!selectedSlot) return;
    setSubmitError(null);
    const result = await createPendingBooking({
      slug: service.slug,
      startIso: selectedSlot.iso,
      name: values.name,
      email: values.email,
      phone: values.phone ?? "",
      notes: values.notes ?? "",
    });
    if (result.ok) {
      setStep("done");
    } else {
      setSubmitError(result.error);
    }
  }

  // ---- Confirmation ----
  if (step === "done" && selectedSlot && selectedDay) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-6 text-center md:p-10">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="size-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">Request received</h2>
        <p className="mt-2 text-foreground/70">
          We&apos;ve got your request for{" "}
          <strong className="text-foreground">{service.title}</strong> on{" "}
          <strong className="text-foreground">
            {selectedDay.weekdayLabel}, {selectedDay.dateLabel}
          </strong>{" "}
          at <strong className="text-foreground">{selectedSlot.label}</strong>.
          We&apos;ll be in touch shortly to confirm.
        </p>
        <Link href="/services" className={`${buttonVariants({ variant: "outline" })} mt-6`}>
          Back to services
        </Link>
      </div>
    );
  }

  // ---- Step 2: details ----
  if (step === "details" && selectedSlot && selectedDay) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <button
          type="button"
          onClick={() => setStep("select")}
          className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Change time
        </button>

        <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <span className="font-medium text-foreground">{service.title}</span>
          {service.priceLabel && <span className="text-foreground/70"> · {service.priceLabel}</span>}
          <br />
          <span className="text-foreground/70">
            {selectedDay.weekdayLabel}, {selectedDay.dateLabel} at {selectedSlot.label}
          </span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" autoComplete="name" {...register("name")} aria-invalid={!!errors.name} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register("email")} aria-invalid={!!errors.email} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Anything we should know? (optional)</Label>
          <Textarea id="notes" rows={3} {...register("notes")} />
        </div>

        {submitError && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {submitError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full px-6">
          {isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmitting ? "Sending request..." : "Confirm booking request"}
        </Button>
        <p className="text-center text-xs text-foreground/50">
          This sends a request. We&apos;ll confirm your appointment before it&apos;s final.
        </p>
      </form>
    );
  }

  // ---- Step 1: pick date + time ----
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
          Pick a day
        </h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {days.map((day) => {
            const active = day.dateKey === selectedDay?.dateKey;
            return (
              <button
                key={day.dateKey}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedDateKey(day.dateKey);
                  setSelectedSlot(null);
                }}
                className={cn(
                  "flex min-w-16 flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <span className="text-xs opacity-80">{day.weekdayLabel}</span>
                <span className="font-medium">{day.dateLabel}</span>
                <span className="text-xs opacity-80">
                  {day.slots.length} {day.slots.length === 1 ? "time" : "times"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selectedDay && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">
            Pick a time
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {selectedDay.slots.map((slot) => {
              const active = selectedSlot?.iso === slot.iso;
              return (
                <button
                  key={slot.iso}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelectedSlot(slot)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <Button
        type="button"
        size="lg"
        disabled={!selectedSlot}
        onClick={() => setStep("details")}
        className="w-full px-6"
      >
        Continue
      </Button>
    </div>
  );
}

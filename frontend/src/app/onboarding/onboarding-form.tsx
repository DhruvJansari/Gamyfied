"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { FormError } from "@/components/form-field";
import { useSubmitOnboarding } from "@/hooks/use-onboarding";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import {
  CATEGORIES_MAX_ITEMS,
  ONBOARDING_GOALS,
  SKILL_CATEGORIES,
  STACK_MAX_ITEMS,
  STACK_TAG_MAX_LENGTH,
  type OnboardingGoal,
  type SkillCategory,
} from "@/services/onboarding";

// UI copy for the backend's enum values. The values themselves come from services/onboarding.
const GOAL_LABELS: Record<OnboardingGoal, { title: string; detail: string }> = {
  GET_HIRED: { title: "Get hired", detail: "A verified profile recruiters can trust." },
  BUILD_AUDIENCE: { title: "Build an audience", detail: "Rank higher, get seen, grow a following." },
  COMPETE: { title: "Compete", detail: "Climb the ladder and hold an S-tier chair." },
};

const CATEGORY_LABELS: Record<SkillCategory, string> = {
  WEB_DEV: "Web development",
  MOBILE_DEV: "Mobile development",
  AI_ML: "AI / ML",
  DSA_CP: "DSA & competitive programming",
  DEVOPS_CLOUD: "DevOps & cloud",
  GAME_DEV: "Game development",
  CYBERSECURITY: "Cybersecurity",
  DATA_SCIENCE: "Data science",
};

const SUGGESTED_STACK = ["TypeScript", "React", "Next.js", "Node.js", "Python", "Go", "Rust", "Java", "Postgres", "Docker"];

const STEPS = [
  { key: "stack", label: "Stack" },
  { key: "goal", label: "Goal" },
  { key: "categories", label: "Ranking" },
] as const;
type Step = (typeof STEPS)[number]["key"];

export function OnboardingForm() {
  const router = useRouter();
  const submit = useSubmitOnboarding();

  const [step, setStep] = useState<Step>("stack");
  const [stack, setStack] = useState<string[]>([]);
  const [stackDraft, setStackDraft] = useState("");
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);

  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const isLastStep = stepIndex === STEPS.length - 1;
  const hasStack = (tag: string) => stack.some((t) => t.toLowerCase() === tag.toLowerCase());
  const isStackFull = stack.length >= STACK_MAX_ITEMS;

  function addStackTag(raw: string) {
    const tag = raw.trim().slice(0, STACK_TAG_MAX_LENGTH);
    if (!tag || hasStack(tag) || isStackFull) return;
    setStack((s) => [...s, tag]);
  }

  function removeStackTag(tag: string) {
    setStack((s) => s.filter((t) => t.toLowerCase() !== tag.toLowerCase()));
  }

  function onStackKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addStackTag(stackDraft);
      setStackDraft("");
    } else if (e.key === "Backspace" && stackDraft === "" && stack.length > 0) {
      setStack((s) => s.slice(0, -1));
    }
  }

  function toggleCategory(category: SkillCategory) {
    setCategories((list) =>
      list.includes(category)
        ? list.filter((c) => c !== category)
        : list.length < CATEGORIES_MAX_ITEMS
          ? [...list, category]
          : list,
    );
  }

  const canContinue: Record<Step, boolean> = {
    stack: stack.length > 0 || stackDraft.trim().length > 0,
    goal: goal !== null,
    categories: categories.length > 0,
  };

  function next() {
    if (step === "stack" && stackDraft.trim()) {
      // A typed-but-not-entered tag still counts; nobody should lose it by clicking Continue.
      addStackTag(stackDraft);
      setStackDraft("");
    }
    setStep(STEPS[stepIndex + 1].key);
  }

  function back() {
    submit.reset();
    setStep(STEPS[stepIndex - 1].key);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!goal || !canContinue.categories) return;
    submit.mutate({ stack, goal, categories }, { onSuccess: () => router.replace("/") });
  }

  const fieldErrors = isApiError(submit.error) ? submit.error.fields : {};
  const fieldError = fieldErrors.stack ?? fieldErrors.goal ?? fieldErrors.categories;
  const formError = submit.error ? (fieldError ?? messageFor(isApiError(submit.error) ? submit.error.code : undefined)) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
      <Progress current={stepIndex} />

      {step === "stack" ? (
        <fieldset className="flex flex-col gap-6">
          <StepHeading
            title="What do you build with?"
            detail={`Three quick questions to place you on the right leaderboards. Type and press Enter, or tap a suggestion. Up to ${STACK_MAX_ITEMS}.`}
          />
          <div className="flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-border-strong bg-canvas px-3 py-2 focus-within:ring-2 focus-within:ring-info-border">
            {stack.map((tag) => (
              <span key={tag} className="flex h-9 items-center gap-1 rounded-pill bg-primary pl-4 pr-2 text-sm text-on-primary">
                {tag}
                <button
                  type="button"
                  onClick={() => removeStackTag(tag)}
                  aria-label={`Remove ${tag}`}
                  className="flex size-6 items-center justify-center rounded-full text-on-primary active:bg-on-primary/20"
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            <input
              name="stack"
              aria-label="Add a technology"
              placeholder={stack.length ? "" : "e.g. React, Postgres"}
              maxLength={STACK_TAG_MAX_LENGTH}
              value={stackDraft}
              disabled={isStackFull}
              onChange={(e) => setStackDraft(e.target.value)}
              onKeyDown={onStackKeyDown}
              autoFocus
              className="h-9 min-w-32 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-3">
            <small className="text-muted">Suggestions</small>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_STACK.filter((tag) => !hasStack(tag)).map((tag) => (
                <Chip key={tag} selected={false} disabled={isStackFull} onClick={() => addStackTag(tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
          </div>
        </fieldset>
      ) : null}

      {step === "goal" ? (
        <fieldset className="flex flex-col gap-6">
          <StepHeading title="What do you want from this?" detail="Pick one. It shapes what your profile leads with." />
          <div role="radiogroup" className="flex flex-col gap-3">
            {ONBOARDING_GOALS.map((value) => {
              const selected = goal === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setGoal(value)}
                  className={`flex items-center gap-4 rounded-md border p-5 text-left transition-colors ${
                    selected ? "border-primary bg-canvas" : "border-hairline bg-canvas active:bg-surface-strong"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                      selected ? "border-primary" : "border-border-strong"
                    }`}
                  >
                    {selected ? <span className="size-2.5 rounded-full bg-primary" /> : null}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-ink">{GOAL_LABELS[value].title}</span>
                    <small className="text-muted">{GOAL_LABELS[value].detail}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {step === "categories" ? (
        <fieldset className="flex flex-col gap-6">
          <StepHeading title="Where should you be ranked?" detail={`Pick up to ${CATEGORIES_MAX_ITEMS}. Each one is its own leaderboard.`} />
          <div className="flex flex-wrap gap-2">
            {SKILL_CATEGORIES.map((value) => {
              const selected = categories.includes(value);
              return (
                <Chip
                  key={value}
                  selected={selected}
                  disabled={!selected && categories.length >= CATEGORIES_MAX_ITEMS}
                  onClick={() => toggleCategory(value)}
                >
                  {CATEGORY_LABELS[value]}
                </Chip>
              );
            })}
          </div>
          <small className="text-muted">
            {categories.length} of {CATEGORIES_MAX_ITEMS} selected
          </small>
        </fieldset>
      ) : null}

      <FormError message={formError} />

      <div className="flex items-center justify-between gap-4 border-t border-hairline pt-6">
        {stepIndex > 0 ? (
          <button type="button" onClick={back} className="h-12 rounded-lg border border-hairline bg-canvas px-5 text-ink active:bg-surface-strong">
            Back
          </button>
        ) : (
          <span />
        )}
        {isLastStep ? (
          <button
            type="submit"
            disabled={submit.isPending || !canContinue.categories}
            className="h-12 rounded-lg bg-primary px-6 text-on-primary active:bg-primary-active disabled:opacity-60"
          >
            {submit.isPending ? "Saving…" : "Finish"}
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={!canContinue[step]}
            className="h-12 rounded-lg bg-primary px-6 text-on-primary active:bg-primary-active disabled:opacity-60"
          >
            Continue
          </button>
        )}
      </div>
    </form>
  );
}

/** Segmented bar: one segment per step, filled up to and including the current one. */
function Progress({ current }: { current: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <small className="text-ink uppercase tracking-wider">Set up your profile</small>
        <small className="text-muted">
          {current + 1} / {STEPS.length} · {STEPS[current].label}
        </small>
      </div>
      <ol className="flex gap-2" aria-hidden>
        {STEPS.map((s, i) => (
          <li key={s.key} className={`h-1 flex-1 rounded-pill ${i <= current ? "bg-primary" : "bg-surface-strong"}`} />
        ))}
      </ol>
    </div>
  );
}

function StepHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <legend className="flex flex-col gap-2">
      <h1 className="text-2xl md:text-3xl">{title}</h1>
      <p className="text-base">{detail}</p>
    </legend>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-10 items-center gap-2 rounded-pill border px-4 text-sm transition-colors disabled:opacity-50 ${
        selected ? "border-primary bg-primary text-on-primary" : "border-hairline bg-canvas text-ink active:bg-surface-strong"
      }`}
    >
      {selected ? <CheckIcon /> : null}
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

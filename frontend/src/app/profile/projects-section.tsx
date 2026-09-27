"use client";

import { useState, type FormEvent } from "react";

import { FormError, FormField } from "@/components/form-field";
import { useCreateProject, useRemoveProject, useUpdateProject, useVerifyProject } from "@/hooks/use-profile";
import { isApiError } from "@/lib/api/errors";
import { messageFor } from "@/lib/messages";
import type { OwnerProfile, ScoreItem } from "@/services/profiles";
import { PROJECT_DESCRIPTION_MIN, PROJECT_TECHNOLOGIES_MAX, PROJECTS_MAX, type Project, type ProjectInput, type ProjectType } from "@/services/projects";

import { Points, PrimaryButton, SecondaryButton, Section, Textarea, VerificationChip } from "@/components/profile-ui";

const TYPE_OPTIONS: { value: ProjectType; title: string; detail: string }[] = [
  { value: "PUBLIC", title: "Public / personal", detail: "Anyone can open it. Fully verifiable, full score." },
  { value: "PRIVATE", title: "Organisation / private", detail: "Behind a login or NDA. Can't be inspected, so the score is capped." },
];

export function ProjectsSection({ profile }: { profile: OwnerProfile }) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const projects = profile.projects;
  const items = profile.scoreBreakdown.sections.find((s) => s.key === "PROJECTS")?.items ?? [];
  const isFull = projects.length >= PROJECTS_MAX;

  return (
    <Section
      id="projects"
      title="Projects"
      count={`${projects.length} of ${PROJECTS_MAX}`}
      hint="One project with a description completes this task. A repository and a live link are evidence; verification unlocks the rest."
      action={
        !adding && !isFull ? (
          <SecondaryButton onClick={() => setAdding(true)} className="h-10">
            Add project
          </SecondaryButton>
        ) : undefined
      }
    >
      {adding ? <ProjectForm onDone={() => setAdding(false)} /> : null}

      {projects.length === 0 && !adding ? (
        <p className="text-base text-muted">No projects yet. Something you built, with a couple of sentences about it, is enough to start.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {projects.map((project) =>
            editingId === project.id ? (
              <li key={project.id}>
                <ProjectForm project={project} onDone={() => setEditingId(null)} />
              </li>
            ) : (
              <ProjectCard key={project.id} project={project} item={items.find((i) => i.key === project.id)} onEdit={() => setEditingId(project.id)} />
            ),
          )}
        </ul>
      )}
      {isFull ? <small className="text-muted">You&apos;ve added the maximum of {PROJECTS_MAX}. Remove one to add another.</small> : null}
    </Section>
  );
}

function ProjectCard({ project, item, onEdit }: { project: Project; item?: ScoreItem; onEdit: () => void }) {
  const remove = useRemoveProject();
  const verify = useVerifyProject();
  const hasEvidence = !!(project.repoUrl || project.liveUrl);
  const canVerify = hasEvidence && project.verificationStatus !== "VERIFICATION_PENDING" && project.verificationStatus !== "VERIFIED";
  const error = remove.error ?? verify.error;

  return (
    <li className="flex flex-col gap-3 rounded-md border border-hairline bg-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="flex flex-wrap items-center gap-2 text-lg md:text-xl">
            {project.name}
            {project.projectType === "PRIVATE" ? <small className="rounded-pill border border-hairline px-2 text-muted">Private</small> : null}
            <VerificationChip status={project.verificationStatus} />
          </h3>
          <p className="whitespace-pre-line text-base">{project.description}</p>
        </div>
        {item ? <Points value={item.points} max={item.max} /> : null}
      </div>

      {project.technologies.length ? (
        <div className="flex flex-wrap gap-2">
          {project.technologies.map((t) => (
            <small key={t} className="rounded-pill border border-hairline px-2.5 py-0.5 text-ink">
              {t}
            </small>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-4 text-sm">
        {project.repoUrl ? (
          <a href={project.repoUrl} target="_blank" rel="noreferrer">
            Repository
          </a>
        ) : null}
        {project.liveUrl ? (
          <a href={project.liveUrl} target="_blank" rel="noreferrer">
            Live
          </a>
        ) : null}
        {!hasEvidence ? <small className="text-muted">No links yet</small> : null}
      </div>

      {item?.hint ? <small className="text-muted">{item.hint}</small> : null}
      {project.verificationStatus === "VERIFICATION_PENDING" ? (
        <small className="text-muted">Queued. Agent verification is coming soon. Your score will update when it runs.</small>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-3">
        <PrimaryButton
          onClick={() => verify.mutate(project.id)}
          disabled={!canVerify || verify.isPending}
          title={!hasEvidence ? "Add a repository or live link first" : undefined}
          className="h-10"
        >
          {verify.isPending ? "Requesting…" : "Verify project"}
        </PrimaryButton>
        <button type="button" onClick={onEdit} className="text-sm underline-offset-4 hover:underline">
          Edit
        </button>
        <button
          type="button"
          onClick={() => remove.mutate(project.id)}
          disabled={remove.isPending}
          className="text-sm text-muted underline-offset-4 hover:underline disabled:opacity-60"
        >
          Remove
        </button>
      </div>
      <FormError message={error ? messageFor(isApiError(error) ? error.code : undefined) : null} />
    </li>
  );
}

function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const create = useCreateProject();
  const update = useUpdateProject();
  const mutation = project ? update : create;

  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    technologies: project?.technologies.join(", ") ?? "",
    repoUrl: project?.repoUrl ?? "",
    liveUrl: project?.liveUrl ?? "",
    projectType: project?.projectType ?? ("PUBLIC" as ProjectType),
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const input: ProjectInput = {
      name: form.name,
      description: form.description,
      technologies: form.technologies.split(",").map((t) => t.trim()).filter(Boolean).slice(0, PROJECT_TECHNOLOGIES_MAX),
      repoUrl: form.repoUrl.trim() || null,
      liveUrl: form.liveUrl.trim() || null,
      projectType: form.projectType,
    };
    if (project) update.mutate({ id: project.id, input }, { onSuccess: onDone });
    else create.mutate(input, { onSuccess: onDone });
  }

  const fields = isApiError(mutation.error) ? mutation.error.fields : {};
  const formError = mutation.error && Object.keys(fields).length === 0 ? messageFor(isApiError(mutation.error) ? mutation.error.code : undefined) : null;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 rounded-md border border-border-strong bg-canvas p-4 md:p-5">
      <h3 className="text-lg">{project ? "Edit project" : "New project"}</h3>
      <FormField label="Name" name="name" value={form.name} onChange={set("name")} maxLength={80} error={fields.name} autoFocus />
      <Textarea
        label="Description"
        name="description"
        hint={`at least ${PROJECT_DESCRIPTION_MIN} characters (${form.description.trim().length})`}
        placeholder="What it does, who it's for, what was hard about it."
        value={form.description}
        onChange={set("description")}
        maxLength={2000}
        error={fields.description}
      />
      <FormField
        label="Technologies"
        name="technologies"
        hint={`comma-separated, up to ${PROJECT_TECHNOLOGIES_MAX}`}
        placeholder="Next.js, Postgres, Redis"
        value={form.technologies}
        onChange={set("technologies")}
        error={fields.technologies}
      />
      <div className="grid gap-5 md:grid-cols-2">
        <FormField label="Repository URL" name="repoUrl" hint="GitHub, GitLab, Bitbucket or Codeberg" type="url" placeholder="https://github.com/you/project" value={form.repoUrl} onChange={set("repoUrl")} error={fields.repoUrl} />
        <FormField label="Live / demo URL" name="liveUrl" hint="optional" type="url" placeholder="https://" value={form.liveUrl} onChange={set("liveUrl")} error={fields.liveUrl} />
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-ink">Project type</legend>
        <div role="radiogroup" className="grid gap-3 md:grid-cols-2">
          {TYPE_OPTIONS.map((opt) => {
            const selected = form.projectType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setForm((f) => ({ ...f, projectType: opt.value }))}
                className={`flex items-start gap-3 rounded-md border p-4 text-left ${selected ? "border-primary bg-canvas" : "border-hairline bg-canvas active:bg-surface-strong"}`}
              >
                <span aria-hidden className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary" : "border-border-strong"}`}>
                  {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-ink">{opt.title}</span>
                  <small className="text-muted">{opt.detail}</small>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <FormError message={formError} />
      <div className="flex gap-3 border-t border-hairline pt-5">
        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : project ? "Save" : "Add project"}
        </PrimaryButton>
        <SecondaryButton onClick={onDone} disabled={mutation.isPending}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}

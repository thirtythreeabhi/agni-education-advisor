"use client";

import { useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

function toStableKey(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function InstitutionForm({ action }: Props) {
  const [name, setName] = useState("");
  const [stableKey, setStableKey] = useState("");
  const [keyWasEdited, setKeyWasEdited] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!keyWasEdited) {
      setStableKey(toStableKey(value));
    }
  }
  function handleKeyChange(value: string) {
    setStableKey(value);
    setKeyWasEdited(true);
  }

  function regenerateStableKey() {
    setStableKey(toStableKey(name));
    setKeyWasEdited(false);
  }

  return (
    <form action={action} className="grid gap-4">
      <label className="grid gap-2">
        Official name
        <input
          name="officialName"
          autoComplete="organization"
          required
          maxLength={300}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </label>
      <label className="grid gap-2">
        Stable key
        <span className="relative block">
          <input
            name="stableKey"
            placeholder="example-university"
            pattern="[a-z0-9][a-z0-9._-]{1,99}"
            title="Use 2–100 lowercase letters, numbers, dots, underscores, or hyphens; start with a letter or number."
            aria-describedby="stable-key-help"
            required
            value={stableKey}
            onChange={(e) => handleKeyChange(e.target.value)}
            className="w-full pr-12"
          />
          <span
            id="stable-key-help"
            role="tooltip"
            className="sr-only"
          >
            Suggested from the official name. You can edit it; it must be unique.
          </span>
          <span className="group/regenerate absolute right-1 top-1/2 -translate-y-1/2">
            <button
              type="button"
              className="button-ghost button-icon rounded-md"
              aria-label="Regenerate from name"
              aria-describedby="stable-key-regenerate-tooltip"
              onClick={regenerateStableKey}
            >
              <ArrowsClockwise size={18} aria-hidden="true" />
            </button>
            <span
              id="stable-key-regenerate-tooltip"
              role="tooltip"
              className="pointer-events-none invisible absolute right-0 top-full z-10 mt-1 w-max rounded-md border border-border bg-surface px-3 py-2 text-sm font-normal text-content opacity-0 shadow-sm transition-opacity group-hover/regenerate:visible group-hover/regenerate:opacity-100 group-focus-within/regenerate:visible group-focus-within/regenerate:opacity-100"
            >
              Regenerate from name
            </span>
          </span>
        </span>
      </label>
      <label className="grid gap-2">
        Country code
        <input name="countryCode" placeholder="IN" maxLength={2} pattern="[A-Za-z]{2}" title="Enter a two-letter country code, such as IN." required />
      </label>

      <fieldset className="grid gap-4 rounded-lg border border-border p-4">
        <legend className="px-1 font-medium text-content">Official source details</legend>
        <p className="text-sm text-secondary">Provide the source used to establish this institution record.</p>
        <label className="grid gap-2">
          Official source URL
          <input name="sourceUrl" type="url" autoComplete="url" required />
        </label>
        <label className="grid gap-2">
          Source publisher
          <input name="sourcePublisher" required />
        </label>
        <label className="grid gap-2">
          Authority
          <select name="authorityType" defaultValue="university">
            <option value="university">University</option>
            <option value="government">Government</option>
            <option value="accreditor">Accreditor</option>
            <option value="exam_body">Exam body</option>
            <option value="other_official">Other official</option>
          </select>
        </label>
        <label className="grid gap-2">
          Retrieved on
          <input name="sourceRetrievedAt" type="date" required />
        </label>
      </fieldset>

      <button type="submit" className="button-primary w-full">
        Create institution
      </button>
    </form>
  );
}

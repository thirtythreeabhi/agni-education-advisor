"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Clock, EnvelopeSimple, UserPlus, UsersThree, X } from "@phosphor-icons/react";

type Relationship = "Parent" | "Guardian" | "Student";

type Member = {
  id: string;
  name: string;
  email: string | null;
  relationship: "Owner" | "Student";
  access: "Active account" | "Profile only · no sign-in access";
};

type StudentProfile = { id: string; name: string };
type PendingInvitation = { id: string; email: string; relationship: Relationship };

export default function MembersAccess({
  ownerName,
  ownerEmail,
  students,
  canManageInvitations,
}: {
  ownerName: string;
  ownerEmail: string | null;
  students: StudentProfile[];
  canManageInvitations: boolean;
}) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("Parent");
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [notice, setNotice] = useState("");
  const inviteButtonRef = useRef<HTMLButtonElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (isInviteOpen) emailInputRef.current?.focus();
    else if (wasOpen.current) inviteButtonRef.current?.focus();
    wasOpen.current = isInviteOpen;
  }, [isInviteOpen]);

  const members: Member[] = [
    { id: "family-owner", name: ownerName, email: ownerEmail, relationship: "Owner", access: "Active account" },
    ...students.map((student) => ({
      id: student.id,
      name: student.name,
      email: null,
      relationship: "Student" as const,
      access: "Profile only · no sign-in access" as const,
    })),
  ];

  function closeInvite() {
    setIsInviteOpen(false);
  }

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManageInvitations) return;
    setPendingInvitations((current) => [{ id: crypto.randomUUID(), email: email.trim(), relationship }, ...current]);
    setNotice(`Preview invitation added for ${email.trim()}. No email was sent and no access was granted.`);
    setEmail("");
    setRelationship("Parent");
    closeInvite();
  }

  function cancelInvitation(invitation: PendingInvitation) {
    setPendingInvitations((current) => current.filter((item) => item.id !== invitation.id));
    setNotice(`Preview invitation for ${invitation.email} was cancelled.`);
  }

  return <section className="mt-8" aria-labelledby="members-heading">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="members-heading" className="text-xl font-semibold">Members &amp; Access</h2>
        <p className="mt-2 max-w-2xl text-sm text-secondary">Review accounts and student profiles connected to this family.</p>
      </div>
      <button ref={inviteButtonRef} type="button" className="button-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm" onClick={() => { setNotice(""); setIsInviteOpen(true); }} disabled={!canManageInvitations}>
        <UserPlus size={18} aria-hidden="true" /> Invite Member
      </button>
    </div>

    <p className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-content">
      Preview only: invitations stay in temporary page state. No email is sent, no account is created, and no access is granted.
    </p>

    {!canManageInvitations && <p className="mt-3 text-sm text-secondary">Invitation controls are unavailable because this account’s family permissions could not be confirmed.</p>}
    {notice && <p className="mt-4 rounded-lg border border-success bg-success/10 px-4 py-3 text-sm text-content" role="status" aria-live="polite">{notice}</p>}

    <div className="mt-5 overflow-hidden rounded-xl border border-border bg-surface">
      <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Family members</h3>
      <ul className="divide-y divide-border">
        {members.map((member) => <li key={member.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_9rem_12rem] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-page text-primary" aria-hidden="true"><UsersThree size={20} /></span>
            <div className="min-w-0"><p className="truncate font-medium text-content">{member.name}</p><p className="truncate text-sm text-secondary">{member.email ?? "No account email linked"}</p></div>
          </div>
          <div><p className="text-xs text-secondary sm:hidden">Relationship</p><p className="text-sm text-content">{member.relationship}</p></div>
          <div><p className="text-xs text-secondary sm:hidden">Access status</p><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${member.relationship === "Owner" ? "status-success" : "status-neutral"}`}>{member.access}</span></div>
        </li>)}
      </ul>
    </div>

    <section className="mt-5 rounded-xl border border-border bg-surface p-4" aria-labelledby="additional-members-heading">
      <h3 id="additional-members-heading" className="font-semibold text-content">Parent and guardian accounts</h3>
      <p className="mt-2 text-sm text-secondary">No additional parent or guardian accounts are linked. Account membership will be available after invitation workflows are connected.</p>
    </section>

    <section className="mt-5 rounded-xl border border-border bg-surface p-4" aria-labelledby="pending-heading">
      <div className="flex items-center gap-2"><Clock size={18} className="text-secondary" aria-hidden="true" /><h3 id="pending-heading" className="font-semibold text-content">Pending invitations</h3></div>
      {pendingInvitations.length === 0 ? <p className="mt-3 rounded-lg bg-page p-4 text-sm text-secondary">No pending invitations.</p> : <ul className="mt-3 divide-y divide-border">
        {pendingInvitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0"><p className="truncate font-medium text-content">{invitation.email}</p><p className="text-sm text-secondary">{invitation.relationship} · <span className="status-warning rounded-full border px-2 py-0.5 text-xs">Pending</span></p></div>
          <button type="button" className="button-secondary rounded-lg px-3 py-2 text-sm" onClick={() => cancelInvitation(invitation)} disabled={!canManageInvitations}>Cancel invitation</button>
        </li>)}
      </ul>}
    </section>

    {isInviteOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInvite(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="invite-title" aria-describedby="invite-permissions" className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-5 sm:p-6" onKeyDown={(event) => { if (event.key === "Escape") closeInvite(); }}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="invite-title" className="text-xl font-semibold text-content">Invite a family member</h2><p className="mt-1 text-sm text-secondary">Add a preview invitation for this family.</p></div>
          <button type="button" className="button-ghost button-icon rounded-lg" aria-label="Close invitation dialog" onClick={closeInvite}><X size={20} aria-hidden="true" /></button>
        </div>
        <form className="mt-5 grid gap-4" onSubmit={submitInvitation}>
          <label htmlFor="invite-email" className="grid gap-2 text-sm font-medium text-content">Email address
            <input ref={emailInputRef} id="invite-email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" />
          </label>
          <label htmlFor="invite-relationship" className="grid gap-2 text-sm font-medium text-content">Relationship
            <select id="invite-relationship" name="relationship" value={relationship} onChange={(event) => setRelationship(event.target.value as Relationship)}>
              <option value="Parent">Parent</option><option value="Guardian">Guardian</option><option value="Student">Student</option>
            </select>
          </label>
          <div id="invite-permissions" className="rounded-xl border border-border bg-page p-4">
            <h3 className="text-sm font-semibold text-content">Access permissions</h3>
            <p className="mt-2 text-sm text-secondary">{relationship} is selected. Future access rules will be enforced by the invitation service. This preview grants no family, student, or financial access.</p>
          </div>
          <p className="flex items-start gap-2 text-sm text-secondary"><EnvelopeSimple size={18} className="mt-0.5 shrink-0" aria-hidden="true" />This is a local UI simulation. No message will be sent.</p>
          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <button type="button" className="button-secondary rounded-lg px-4 py-2.5 text-sm" onClick={closeInvite}>Cancel</button>
            <button type="submit" className="button-primary rounded-lg px-4 py-2.5 text-sm" disabled={!canManageInvitations}>Send Invitation</button>
          </div>
        </form>
      </section>
    </div>}
  </section>;
}

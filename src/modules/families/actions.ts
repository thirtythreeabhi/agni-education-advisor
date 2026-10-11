"use server";

import { auth } from "@/auth";
import { createFamily, addStudent, updateStudent } from "./service";
import { z } from "zod";

export type FormActionState = { error?: string; redirectTo?: string };

async function currentUserId() {
  const session = await auth();
  return session?.user?.id;
}

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function studentValues(formData: FormData) {
  return {
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName") || undefined,
    currentGrade: text(formData, "currentGrade") || undefined,
    schoolName: text(formData, "schoolName") || undefined,
    academicSummary: text(formData, "academicSummary") || undefined,
    desiredDegree: text(formData, "desiredDegree") || undefined,
    careerGoals: text(formData, "careerGoals") || undefined,
    preferredCountries: text(formData, "preferredCountries").split(",").map((country) => country.trim()).filter(Boolean),
    preferredIntake: text(formData, "preferredIntake") || undefined,
  };
}

export async function createFamilyAction(_previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const ownerUserId = await currentUserId();
  if (!ownerUserId) return { error: "Your session has expired. Please sign in again." };
  try {
    const family = await createFamily(ownerUserId, { name: text(formData, "name") });
    return { redirectTo: `/family/${family.id}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Enter a family name between 1 and 160 characters." };
    return { error: "Unable to create the family right now." };
  }
}

export async function addStudentAction(familyId: string, _previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const ownerUserId = await currentUserId();
  if (!ownerUserId) return { error: "Your session has expired. Please sign in again." };
  try {
    const student = await addStudent(ownerUserId, familyId, studentValues(formData));
    return { redirectTo: `/family/${familyId}/students/${student.id}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Check the student details and try again." };
    if (error instanceof Error && error.message === "FAMILY_NOT_FOUND") return { error: "Family not found." };
    return { error: "Unable to add the student right now." };
  }
}

export async function updateStudentAction(familyId: string, studentId: string, _previous: FormActionState, formData: FormData): Promise<FormActionState> {
  const ownerUserId = await currentUserId();
  if (!ownerUserId) return { error: "Your session has expired. Please sign in again." };
  try {
    await updateStudent(ownerUserId, familyId, studentId, studentValues(formData));
    return { redirectTo: `/family/${familyId}/students/${studentId}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { error: "Check the student details and try again." };
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") return { error: "Student not found." };
    return { error: "Unable to save the student right now." };
  }
}

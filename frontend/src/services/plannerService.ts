import { apiRequest } from "./api";

type SubjectPayload = {
  name: string;
  color: string;
};

type PlannerSessionPayload = {
  subjectId: string;
  topicName: string;
  date: string;
  startHour: number;
  durationMinutes: number;
  notes: string;
  topicId?: string | null;
};

type GeneratePlannerPayload = {
  weekStartDate?: string;
  availableMinutesPerDay?: number;
  topicIds?: string[];
  preferenceByTopic?: Record<string, number>;
};

export type SubjectApi = {
  _id: string;
  name: string;
  color: string;
};

export type PlannerSessionApi = {
  _id: string;
  subjectId: string;
  topicName: string;
  date: string;
  startHour: number;
  durationMinutes: number;
  notes: string;
};

type GeneratePlannerResponse = {
  weekStartDate: string;
  count: number;
  source: string;
  items: PlannerSessionApi[];
};

export function listSubjects(token: string) {
  return apiRequest<{ items: SubjectApi[] }>("/subjects?page=1&limit=200", { token });
}

export function createSubject(payload: SubjectPayload, token: string) {
  return apiRequest<{ item: SubjectApi }>("/subjects", {
    method: "POST",
    body: payload,
    token,
  });
}

export function updateSubject(id: string, payload: Partial<SubjectPayload>, token: string) {
  return apiRequest<{ item: SubjectApi }>(`/subjects/${id}`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function deleteSubject(id: string, token: string) {
  return apiRequest<void>(`/subjects/${id}`, {
    method: "DELETE",
    token,
  });
}

export function listPlannerSessions(token: string) {
  return apiRequest<{ items: PlannerSessionApi[] }>("/planner/sessions?page=1&limit=500", { token });
}

export function createPlannerSession(payload: PlannerSessionPayload, token: string) {
  return apiRequest<{ item: PlannerSessionApi }>("/planner/sessions", {
    method: "POST",
    body: payload,
    token,
  });
}

export function updatePlannerSession(id: string, payload: Partial<PlannerSessionPayload>, token: string) {
  return apiRequest<{ item: PlannerSessionApi }>(`/planner/sessions/${id}`, {
    method: "PATCH",
    body: payload,
    token,
  });
}

export function deletePlannerSession(id: string, token: string) {
  return apiRequest<void>(`/planner/sessions/${id}`, {
    method: "DELETE",
    token,
  });
}

export function generatePlanner(payload: GeneratePlannerPayload, token: string) {
  return apiRequest<GeneratePlannerResponse>("/planner/generate", {
    method: "POST",
    body: payload,
    token,
  });
}

export type EmotionLabel =
  | "happy"
  | "neutral"
  | "confused"
  | "bored"
  | "stressed"
  | "tired"
  | "frustrated";

export type EmotionEvent = {
  timestamp: number;
  emotion: EmotionLabel;
  confidence: number;
};

export type Subject = {
  id: string;
  name: string;
  color: string;
};

export type Topic = {
  id: string;
  subjectId: string;
  name: string;
  deadline: Date;
  difficulty: number;
  preparationPercent: number;
};

export type SessionRecord = {
  id: string;
  subjectId: string;
  topicId: string;
  topicName?: string;
  startTime: Date;
  durationMinutes: number;
  focusPercent: number;
  emotionBreakdown: Record<EmotionLabel, number>;
  focusTimeline: number[];
};

export type PlannerSession = {
  id: string;
  subjectId: string;
  topicName: string;
  date: Date;
  startHour: number;
  durationMinutes: number;
  notes: string;
};

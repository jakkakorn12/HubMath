export type LessonStep = {
  title: string;
  body: string[];
  formula?: string[];
  worked?: { ask: string; answer: string };
};

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  correct: number;
  solution: string;
};

export type SheetEntry = { name: string; formula: string };

export type TopicDef = {
  slug: string;
  name: string;
  subtitle: string;
  toolName: string;
  steps: LessonStep[];
  sheet: SheetEntry[];
  ToolComponent: React.ComponentType;
  generateQuestion: () => QuizQuestion;
};

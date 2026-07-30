import type { TopicDef } from "../types";
import { steps } from "./trig/steps";
import { sheet } from "./trig/sheet";
import { generateTrigQuestion } from "./trig/quiz";
import UnitCircleTool from "./trig/UnitCircleTool";

export const TOPIC_REGISTRY: Record<string, TopicDef> = {
  trig: {
    slug: "trig",
    name: "ฟังก์ชันตรีโกณมิติ",
    subtitle: "วงกลมหนึ่งหน่วย มุมพิเศษ สูตรลดทอน",
    toolName: "วงกลมหนึ่งหน่วยลากได้",
    steps,
    sheet,
    ToolComponent: UnitCircleTool,
    generateQuestion: generateTrigQuestion,
  },
};

export function getTopic(slug: string): TopicDef | undefined {
  return TOPIC_REGISTRY[slug];
}

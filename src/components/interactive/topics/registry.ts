import type { TopicDef } from "../types";
import { steps as trigSteps } from "./trig/steps";
import { sheet as trigSheet } from "./trig/sheet";
import { generateTrigQuestion } from "./trig/quiz";
import UnitCircleTool from "./trig/UnitCircleTool";
import { steps as exponentSteps } from "./exponent/steps";
import { sheet as exponentSheet } from "./exponent/sheet";
import { generateExponentQuestion } from "./exponent/quiz";
import PowerTool from "./exponent/PowerTool";
import { steps as expLogSteps } from "./exp_log/steps";
import { sheet as expLogSheet } from "./exp_log/sheet";
import { generateExpLogQuestion } from "./exp_log/quiz";
import GraphTool from "./exp_log/GraphTool";
import { steps as interestSteps } from "./interest/steps";
import { sheet as interestSheet } from "./interest/sheet";
import { generateInterestQuestion } from "./interest/quiz";
import MoneyTool from "./interest/MoneyTool";
import { steps as vectorSteps } from "./vector/steps";
import { sheet as vectorSheet } from "./vector/sheet";
import { generateVectorQuestion } from "./vector/quiz";
import VectorTool from "./vector/VectorTool";

export const TOPIC_REGISTRY: Record<string, TopicDef> = {
  trig: {
    slug: "trig",
    name: "ฟังก์ชันตรีโกณมิติ",
    subtitle: "วงกลมหนึ่งหน่วย มุมพิเศษ สูตรลดทอน",
    toolName: "วงกลมหนึ่งหน่วยลากได้",
    steps: trigSteps,
    sheet: trigSheet,
    ToolComponent: UnitCircleTool,
    generateQuestion: generateTrigQuestion,
  },
  exponent: {
    slug: "exponent",
    name: "เลขยกกำลังและราก",
    subtitle: "กฎเลขยกกำลัง เลขชี้กำลังเป็นศูนย์/ลบ/เศษส่วน",
    toolName: "กระจายเลขยกกำลัง",
    steps: exponentSteps,
    sheet: exponentSheet,
    ToolComponent: PowerTool,
    generateQuestion: generateExponentQuestion,
  },
  exp_log: {
    slug: "exp_log",
    name: "ฟังก์ชันเอกซ์โพเนนเชียลและลอการิทึม",
    subtitle: "กราฟ สมการ อสมการ",
    toolName: "กราฟ y=b^x และ log",
    steps: expLogSteps,
    sheet: expLogSheet,
    ToolComponent: GraphTool,
    generateQuestion: generateExpLogQuestion,
  },
  interest: {
    slug: "interest",
    name: "ดอกเบี้ยและมูลค่าเงิน",
    subtitle: "ทบต้น ค่าปัจจุบัน เงินผ่อน",
    toolName: "เครื่องคิดดอกเบี้ยทบต้น",
    steps: interestSteps,
    sheet: interestSheet,
    ToolComponent: MoneyTool,
    generateQuestion: generateInterestQuestion,
  },
  vector: {
    slug: "vector",
    name: "เวกเตอร์",
    subtitle: "การบวก ผลคูณเชิงสเกลาร์ การฉาย",
    toolName: "ลากเวกเตอร์บนระนาบ",
    steps: vectorSteps,
    sheet: vectorSheet,
    ToolComponent: VectorTool,
    generateQuestion: generateVectorQuestion,
  },
};

export function getTopic(slug: string): TopicDef | undefined {
  return TOPIC_REGISTRY[slug];
}

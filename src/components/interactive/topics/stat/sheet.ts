import type { SheetEntry } from "../../types";

export const sheet: SheetEntry[] = [
  { name: "มัชฌิมเลขคณิต", formula: "mean = [Σx|n]" },
  { name: "พิสัย", formula: "range = max − min" },
  { name: "ส่วนเบี่ยงเบนมาตรฐาน", formula: "SD = √[Σ(x−mean)^{2}|n−1]" },
  { name: "พิสัยระหว่างควอร์ไทล์", formula: "IQR = Q3 − Q1" },
  { name: "รั้วตรวจค่านอกเกณฑ์", formula: "Q1 − 1.5×IQR  ถึง  Q3 + 1.5×IQR" },
];

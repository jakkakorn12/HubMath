// ลิงก์ Google Sheets ที่ครูใช้กรอกคะแนน/เช็คชื่อ
export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1assKvy4CqVHfuSJ-201-YRT7wVoxA-rXa-ihDmSWAqo/edit";

// subject_id → ชื่อแท็บคะแนนในชีท (ตรงกับ SUBJECT_MAP ใน Apps Script)
export const SHEET_TAB_BY_SUBJECT: Record<string, string> = {
  "11111111-0000-0000-0000-000000000001": "BM500",
  "11111111-0000-0000-0000-000000000002": "AM500",
  "11111111-0000-0000-0000-000000000003": "EM500",
};

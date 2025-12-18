
import { GoogleGenAI } from "@google/genai";

// Always use the named parameter for apiKey and obtain it directly from process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * AI 章节总结
 */
export async function summarizeChapter(text: string): Promise<string> {
  if (!text) return "";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `请简要总结以下书籍章节的内容，提取核心信息：\n\n${text.substring(0, 2000)}`
    });
    // Use the .text property directly as it returns the extracted string output.
    return response.text || "";
  } catch (error) { 
    console.error("AI 总结失败:", error);
    return "总结暂不可用"; 
  }
}

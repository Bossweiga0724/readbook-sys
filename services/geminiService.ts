
import { GoogleGenAI, Modality, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateSpeech(text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> {
  if (!API_KEY) return null;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return await decodeAudioData(bytes, audioCtx, 24000, 1);
  } catch (error) {
    console.error("语音生成错误:", error);
    return null;
  }
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export async function summarizeChapter(text: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `请用中文为以下书籍章节内容提供一段精炼的总结（约50字以内）："${text.substring(0, 1500)}"`
    });
    return response.text || "无法生成总结。";
  } catch (error) {
    return "AI 总结服务暂时不可用。";
  }
}

export async function fetchBookRankings(): Promise<any[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: '请检索中国大陆地区最受欢迎的免费公版图书排行榜（例如：四大名著、鲁迅文集、沈从文作品等）。请提供12本书，必须包含标题、作者、详细描述、分类（如：古典文学、近现代文学）。封面关键词请使用中文描述。',
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              author: { type: Type.STRING },
              description: { type: Type.STRING },
              category: { type: Type.STRING },
              coverKeyword: { type: Type.STRING }
            },
            required: ['title', 'author', 'description', 'category', 'coverKeyword']
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("获取榜单失败:", error);
    return [];
  }
}

export async function getBookFullContent(title: string, author: string): Promise<{chapters: any[]}> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `你是一名资深的电子书排版专家。请提供中国名著《${title}》(${author}) 的前三章完整且详细的文本。每章内容请尽可能丰富（约1000-1500字），并以标准的段落格式返回。`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            chapters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING }
                },
                required: ['title', 'content']
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"chapters": []}');
  } catch (error) {
    return { chapters: [] };
  }
}

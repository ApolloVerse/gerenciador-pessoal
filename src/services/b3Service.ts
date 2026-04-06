import { GoogleGenAI, Type } from "@google/genai";

export interface B3CompanyInfo {
  ticker: string;
  cnpj: string;
  corporateName: string;
}

export async function fetchB3CompanyInfo(ticker: string, apiKey: string): Promise<B3CompanyInfo | null> {
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Encontre o CNPJ e o Nome Social (Razão Social) da empresa listada na B3 com o ticker: ${ticker}. 
      Retorne apenas os dados solicitados de forma precisa.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticker: { type: Type.STRING },
            cnpj: { type: Type.STRING, description: "CNPJ formatado (00.000.000/0001-00)" },
            corporateName: { type: Type.STRING, description: "Nome Social ou Razão Social da empresa" }
          },
          required: ["ticker", "cnpj", "corporateName"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    try {
      return JSON.parse(text) as B3CompanyInfo;
    } catch (e) {
      console.error("Erro ao parsear JSON da B3:", e);
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar informações da B3:", error);
    return null;
  }
}

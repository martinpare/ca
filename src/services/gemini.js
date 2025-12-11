import { GoogleGenerativeAI } from '@google/generative-ai';

const MODEL_NAME = 'gemini-2.5-pro';

class GeminiService {
  constructor() {
    this.genAI = null;
    this.model = null;
  }

  initialize(apiKey) {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: MODEL_NAME });
  }

  async generateTextWithPDF(systemPrompt, pdfFile) {
    if (!this.genAI) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const modelWithSystem = this.genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 65536,
          temperature: 0.1,
        },
      });

      const pdfBase64 = await this.fileToBase64(pdfFile);

      const result = await modelWithSystem.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        },
        { text: 'Analyse ce document PDF et extrait toutes les questions selon les formats spécifiés. IMPORTANT: Retourne UNIQUEMENT un JSON valide. Échappe correctement tous les caractères spéciaux dans les chaînes (guillemets avec \\", backslash avec \\\\, etc.). Ne mets pas de balises markdown autour du JSON.' }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text with PDF:', error);
      throw error;
    }
  }

  async generateTextWithImage(systemPrompt, imageData, mimeType) {
    if (!this.genAI) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const modelWithSystem = this.genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 65536,
          temperature: 0.1,
        },
      });

      const result = await modelWithSystem.generateContent([
        {
          inlineData: {
            mimeType: mimeType,
            data: imageData
          }
        },
        { text: 'Analyse cette image et extrait toutes les questions selon les formats spécifiés. IMPORTANT: Retourne UNIQUEMENT un JSON valide. Échappe correctement tous les caractères spéciaux dans les chaînes (guillemets avec \\", backslash avec \\\\, etc.). Ne mets pas de balises markdown autour du JSON.' }
      ]);

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text with image:', error);
      throw error;
    }
  }

  async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  async generateText(prompt) {
    if (!this.model) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error('Error generating text with Gemini:', error);
      throw error;
    }
  }

  async generateTextWithSystemPrompt(systemPrompt, userPrompt) {
    if (!this.genAI) {
      throw new Error('Gemini service not initialized');
    }

    try {
      // Create a model instance with system instruction
      // Utiliser responseMimeType pour forcer une réponse JSON valide
      const modelWithSystem = this.genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: 65536,
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const result = await modelWithSystem.generateContent(userPrompt);
      const response = await result.response;

      // Log pour debug - vérifier la raison de fin
      const candidate = response.candidates?.[0];
      if (candidate) {
        console.log('Gemini finishReason:', candidate.finishReason);
        if (candidate.finishReason === 'MAX_TOKENS') {
          console.warn('ATTENTION: Réponse tronquée à cause de MAX_TOKENS!');
        }
        if (candidate.finishReason !== 'STOP') {
          console.warn('finishReason inattendu:', candidate.finishReason);
        }
      }

      const text = response.text();
      console.log('Longueur de la réponse Gemini:', text.length, 'caractères');
      console.log('=== RÉPONSE GEMINI BRUTE ===');
      console.log(text);
      console.log('=== FIN RÉPONSE GEMINI ===');
      return text;
    } catch (error) {
      console.error('Error generating text with system prompt:', error);
      throw error;
    }
  }

  async generateTextStream(prompt) {
    if (!this.model) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const result = await this.model.generateContentStream(prompt);
      return result.stream;
    } catch (error) {
      console.error('Error generating text stream with Gemini:', error);
      throw error;
    }
  }

  async chat(messages) {
    if (!this.model) {
      throw new Error('Gemini service not initialized');
    }

    try {
      const chat = this.model.startChat({
        history: messages.slice(0, -1),
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });

      const lastMessage = messages[messages.length - 1];
      const result = await chat.sendMessage(lastMessage.parts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      throw error;
    }
  }
}

export default new GeminiService();

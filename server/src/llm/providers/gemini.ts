import { config } from '../../config.js';
import type {
  AnalyzeImageRequest,
  GenerateRequest,
  GenerateStructuredRequest,
  LLMCapability,
  LLMProvider,
  LLMResponse,
  LLMStructuredResponse,
  ModelDefinition,
} from '../types.js';
import { logger } from '../../logger.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini' as const;

  isConfigured(): boolean {
    return Boolean(config.GEMINI_API_KEY && config.GEMINI_API_KEY.trim().length > 0);
  }

  getCapabilities(_modelId: string): LLMCapability[] {
    return ['vision', 'json_mode', 'streaming', 'embeddings'];
  }

  private calculateCost(model: ModelDefinition, inTokens: number, outTokens: number): number {
    const inputCost = (inTokens / 1000) * model.costPer1kInputUsd;
    const outputCost = (outTokens / 1000) * model.costPer1kOutputUsd;
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }

  async generate(req: GenerateRequest, model: ModelDefinition): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.2,
        maxOutputTokens: req.maxTokens ?? 2048,
      },
    };

    if (req.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: req.systemInstruction }],
      };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Gemini API Error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const latencyMs = Date.now() - startTime;
    const candidate = json.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text || '';
    const inTokens = json.usageMetadata?.promptTokenCount || Math.ceil(req.prompt.length / 4);
    const outTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

    return {
      text,
      model: model.id,
      provider: this.name,
      inputTokens: inTokens,
      outputTokens: outTokens,
      latencyMs,
      costEstimateUsd: this.calculateCost(model, inTokens, outTokens),
    };
  }

  async generateStructured<T>(
    req: GenerateStructuredRequest<T>,
    model: ModelDefinition
  ): Promise<LLMStructuredResponse<T>> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

    const body: any = {
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
      generationConfig: {
        temperature: req.temperature ?? 0.1,
        responseMimeType: 'application/json',
      },
    };

    if (req.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: req.systemInstruction }],
      };
    }

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Gemini Structured API Error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const latencyMs = Date.now() - startTime;
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const inTokens = json.usageMetadata?.promptTokenCount || Math.ceil(req.prompt.length / 4);
    const outTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(rawText.length / 4);

    let parsedData: T;
    try {
      const parsedJson = JSON.parse(rawText);
      parsedData = req.schema.parse(parsedJson);
    } catch (parseError: any) {
      logger.warn({ parseError: parseError.message, rawText }, 'JSON validation failed, retrying once...');
      // Retry once as per requirements
      const retryBody = {
        ...body,
        contents: [
          ...body.contents,
          { role: 'model', parts: [{ text: rawText }] },
          { role: 'user', parts: [{ text: `The response did not match the required JSON schema (${parseError.message}). Please return strictly valid JSON conforming to the schema.` }] },
        ],
      };

      const retryResp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(retryBody),
      });

      if (!retryResp.ok) {
        throw new Error(`Failed JSON retry on Gemini: ${await retryResp.text()}`);
      }

      const retryJson: any = await retryResp.json();
      const retryText = retryJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      parsedData = req.schema.parse(JSON.parse(retryText));
    }

    return {
      text: rawText,
      data: parsedData,
      model: model.id,
      provider: this.name,
      inputTokens: inTokens,
      outputTokens: outTokens,
      latencyMs,
      costEstimateUsd: this.calculateCost(model, inTokens, outTokens),
    };
  }

  async *stream(req: GenerateRequest, model: ModelDefinition): AsyncIterable<string> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelName}:streamGenerateContent?key=${config.GEMINI_API_KEY}&alt=sse`;
    const body: any = {
      contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Gemini Stream Error (${response.status}): ${await response.text()}`);
    }

    // @ts-ignore
    for await (const chunk of response.body) {
      const str = Buffer.from(chunk).toString('utf-8');
      yield str;
    }
  }

  async analyzeImage(req: AnalyzeImageRequest, model: ModelDefinition): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model.modelName}:generateContent?key=${config.GEMINI_API_KEY}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: req.prompt },
            {
              inlineData: {
                mimeType: req.mimeType,
                data: req.imageBase64,
              },
            },
          ],
        },
      ],
    };

    if (req.systemInstruction) {
      body.systemInstruction = { parts: [{ text: req.systemInstruction }] };
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini Vision Error (${response.status}): ${await response.text()}`);
    }

    const json: any = await response.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inTokens = json.usageMetadata?.promptTokenCount || 500;
    const outTokens = json.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

    return {
      text,
      model: model.id,
      provider: this.name,
      inputTokens: inTokens,
      outputTokens: outTokens,
      latencyMs: Date.now() - startTime,
      costEstimateUsd: this.calculateCost(model, inTokens, outTokens),
    };
  }

  async embed(text: string, model: ModelDefinition): Promise<number[]> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${config.GEMINI_API_KEY}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini Embedding Error: ${await response.text()}`);
    }

    const json: any = await response.json();
    return json.embedding?.values || [];
  }
}

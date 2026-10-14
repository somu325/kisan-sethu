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

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;

  isConfigured(): boolean {
    return Boolean(config.OPENAI_API_KEY && config.OPENAI_API_KEY.trim().length > 0);
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
    const endpoint = `${config.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

    const messages: any[] = [];
    if (req.systemInstruction) {
      messages.push({ role: 'system', content: req.systemInstruction });
    }
    messages.push({ role: 'user', content: req.prompt });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model.modelName,
        messages,
        temperature: req.temperature ?? 0.2,
        max_tokens: req.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`OpenAI API Error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const latencyMs = Date.now() - startTime;
    const text = json.choices?.[0]?.message?.content || '';
    const inTokens = json.usage?.prompt_tokens || Math.ceil(req.prompt.length / 4);
    const outTokens = json.usage?.completion_tokens || Math.ceil(text.length / 4);

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
    const endpoint = `${config.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

    const messages: any[] = [];
    if (req.systemInstruction) {
      messages.push({ role: 'system', content: req.systemInstruction });
    }
    messages.push({
      role: 'user',
      content: `${req.prompt}\n\nYou must respond strictly with valid JSON.`,
    });

    const body: any = {
      model: model.modelName,
      messages,
      temperature: req.temperature ?? 0.1,
      response_format: { type: 'json_object' },
    };

    let response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = new Error(`OpenAI Structured API Error (${response.status}): ${await response.text()}`);
      (err as any).status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const latencyMs = Date.now() - startTime;
    const rawText = json.choices?.[0]?.message?.content || '{}';
    const inTokens = json.usage?.prompt_tokens || Math.ceil(req.prompt.length / 4);
    const outTokens = json.usage?.completion_tokens || Math.ceil(rawText.length / 4);

    let parsedData: T;
    try {
      const parsedJson = JSON.parse(rawText);
      parsedData = req.schema.parse(parsedJson);
    } catch (parseError: any) {
      logger.warn({ parseError: parseError.message, rawText }, 'JSON validation failed on OpenAI, retrying once...');
      // Retry once
      messages.push({ role: 'assistant', content: rawText });
      messages.push({ role: 'user', content: `JSON schema parse error: ${parseError.message}. Return valid JSON now.` });

      const retryResp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ ...body, messages }),
      });

      if (!retryResp.ok) throw new Error(`OpenAI JSON retry failed: ${await retryResp.text()}`);
      const retryJson: any = await retryResp.json();
      const retryText = retryJson.choices?.[0]?.message?.content || '{}';
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
    const endpoint = `${config.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;
    const messages: any[] = [];
    if (req.systemInstruction) messages.push({ role: 'system', content: req.systemInstruction });
    messages.push({ role: 'user', content: req.prompt });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model.modelName,
        messages,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`OpenAI Stream Error (${response.status}): ${await response.text()}`);
    }

    // @ts-ignore
    for await (const chunk of response.body) {
      const str = Buffer.from(chunk).toString('utf-8');
      yield str;
    }
  }

  async analyzeImage(req: AnalyzeImageRequest, model: ModelDefinition): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = `${config.OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;

    const imageUrl = `data:${req.mimeType};base64,${req.imageBase64}`;

    const messages: any[] = [];
    if (req.systemInstruction) messages.push({ role: 'system', content: req.systemInstruction });
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: req.prompt },
        { type: 'image_url', image_url: { url: imageUrl } },
      ],
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: model.modelName,
        messages,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI Vision Error: ${await response.text()}`);
    const json: any = await response.json();
    const text = json.choices?.[0]?.message?.content || '';
    const inTokens = json.usage?.prompt_tokens || 800;
    const outTokens = json.usage?.completion_tokens || Math.ceil(text.length / 4);

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

  async embed(text: string, _model: ModelDefinition): Promise<number[]> {
    const endpoint = `${config.OPENAI_BASE_URL.replace(/\/$/, '')}/embeddings`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-3-small',
      }),
    });

    if (!response.ok) throw new Error(`OpenAI Embedding Error: ${await response.text()}`);
    const json: any = await response.json();
    return json.data?.[0]?.embedding || [];
  }
}

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

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic' as const;

  isConfigured(): boolean {
    return Boolean(config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY.trim().length > 0);
  }

  getCapabilities(_modelId: string): LLMCapability[] {
    return ['vision', 'json_mode', 'streaming'];
  }

  private calculateCost(model: ModelDefinition, inTokens: number, outTokens: number): number {
    const inputCost = (inTokens / 1000) * model.costPer1kInputUsd;
    const outputCost = (outTokens / 1000) * model.costPer1kOutputUsd;
    return Math.round((inputCost + outputCost) * 1000000) / 1000000;
  }

  async generate(req: GenerateRequest, model: ModelDefinition): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const body: any = {
      model: model.modelName,
      max_tokens: req.maxTokens ?? 2048,
      temperature: req.temperature ?? 0.2,
      messages: [{ role: 'user', content: req.prompt }],
    };

    if (req.systemInstruction) {
      body.system = req.systemInstruction;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      const err = new Error(`Anthropic API Error (${response.status}): ${errText}`);
      (err as any).status = response.status;
      throw err;
    }

    const json: any = await response.json();
    const latencyMs = Date.now() - startTime;
    const text = json.content?.[0]?.text || '';
    const inTokens = json.usage?.input_tokens || Math.ceil(req.prompt.length / 4);
    const outTokens = json.usage?.output_tokens || Math.ceil(text.length / 4);

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
    const prompt = `${req.prompt}\n\nIMPORTANT: Respond with pure, parseable JSON conforming to the requested schema. Do not enclose in markdown ticks if possible, or return strictly inside \`\`\`json \`\`\`.`;
    const res = await this.generate({ ...req, prompt }, model);

    let cleaned = res.text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
    }

    let parsedData: T;
    try {
      const parsedJson = JSON.parse(cleaned);
      parsedData = req.schema.parse(parsedJson);
    } catch (parseError: any) {
      logger.warn({ parseError: parseError.message, text: cleaned }, 'Retrying Anthropic JSON parse once...');
      const retryPrompt = `${prompt}\n\nPrevious attempt was invalid JSON: ${parseError.message}. Output ONLY valid JSON:`;
      const retryRes = await this.generate({ ...req, prompt: retryPrompt }, model);
      let retryCleaned = retryRes.text.trim();
      if (retryCleaned.startsWith('```json')) retryCleaned = retryCleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      parsedData = req.schema.parse(JSON.parse(retryCleaned));
    }

    return {
      ...res,
      data: parsedData,
    };
  }

  async *stream(req: GenerateRequest, model: ModelDefinition): AsyncIterable<string> {
    const endpoint = 'https://api.anthropic.com/v1/messages';
    const body: any = {
      model: model.modelName,
      max_tokens: req.maxTokens ?? 2048,
      stream: true,
      messages: [{ role: 'user', content: req.prompt }],
    };
    if (req.systemInstruction) body.system = req.systemInstruction;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Anthropic Stream Error (${response.status}): ${await response.text()}`);
    }

    // @ts-ignore
    for await (const chunk of response.body) {
      yield Buffer.from(chunk).toString('utf-8');
    }
  }

  async analyzeImage(req: AnalyzeImageRequest, model: ModelDefinition): Promise<LLMResponse> {
    const startTime = Date.now();
    const endpoint = 'https://api.anthropic.com/v1/messages';

    const body: any = {
      model: model.modelName,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: req.mimeType,
                data: req.imageBase64,
              },
            },
            {
              type: 'text',
              text: req.prompt,
            },
          ],
        },
      ],
    };

    if (req.systemInstruction) body.system = req.systemInstruction;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Anthropic Vision Error: ${await response.text()}`);
    const json: any = await response.json();
    const text = json.content?.[0]?.text || '';
    const inTokens = json.usage?.input_tokens || 1000;
    const outTokens = json.usage?.output_tokens || Math.ceil(text.length / 4);

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

  async embed(_text: string, _model: ModelDefinition): Promise<number[]> {
    throw new Error('Anthropic does not provide an embedding endpoint. Use Gemini or OpenAI for embeddings.');
  }
}

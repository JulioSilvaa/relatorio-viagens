import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiOcrProvider } from '../../src/modules/ocr/ocr-provider.gemini.js';
import type {
  OcrExtractInput,
  OcrExtractionFields,
  OcrExtractionResult,
  OcrProvider,
} from '../../src/modules/ocr/ocr.types.js';

const INPUT: OcrExtractInput = {
  fileData: new Uint8Array([1, 2, 3, 4]),
  fileType: 'image/jpeg',
  fileName: 'comprovante.jpg',
};

function fakePaddleProvider(result: OcrExtractionResult): OcrProvider {
  return {
    async extract(): Promise<OcrExtractionResult> {
      return result;
    },
  };
}

function paddleSuccess(fields: Partial<OcrExtractionFields> = {}): OcrExtractionResult {
  return { status: 'SUCESSO', data: { textoOriginal: 'texto do paddle', itens: [], ...fields } };
}

function geminiResponse(json: Record<string, unknown>): Response {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(json) }] } }] }),
    { status: 200 },
  );
}

const VALID_CUPOM = {
  origem: { arquivo: 'comprovante.jpg', pagina: 1, imagem_id: 'comprovante.jpg' },
  tipo_documento: 'NFC_E',
  tipo_documento_confianca: 'alta',
  itens: [],
  confianca_extracao: 'alta',
  alerta_reconciliacao: false,
  valores: { total: 47 },
};

describe('GeminiOcrProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lança sem um provider auxiliar de código de barras', () => {
    expect(() => new GeminiOcrProvider('key', 'gemini-3.6-flash', 1000)).toThrow(
      'GeminiOcrProvider requer um provider OCR de texto auxiliar.',
    );
  });

  it('envia a imagem como inline_data e desativa o thinking do modelo', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(VALID_CUPOM));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider(paddleSuccess()),
    );

    await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    const parts = body.contents[0].parts;
    expect(
      parts.some(
        (p: { inline_data?: { mime_type: string } }) => p.inline_data?.mime_type === 'image/jpeg',
      ),
    ).toBe(true);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
  });

  it('continua a leitura pela imagem mesmo se o Paddle falhar completamente', async () => {
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(VALID_CUPOM));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider('fake-key', 'gemini-3.6-flash', 5000, {
      async extract(): Promise<OcrExtractionResult> {
        throw new Error('paddle indisponível');
      },
    });

    const result = await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('SUCESSO');
  });

  it('prefere a chave de acesso decodificada do código de barras (Paddle) à lida pelo Gemini na imagem', async () => {
    const cupomComChaveDivergente = {
      ...VALID_CUPOM,
      documento_fiscal: { chave_acesso: '1'.repeat(44) },
    };
    const fetchMock = vi.fn().mockResolvedValue(geminiResponse(cupomComChaveDivergente));
    vi.stubGlobal('fetch', fetchMock);

    const chaveDoBarcode = '9'.repeat(44);
    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider(paddleSuccess({ chaveAcesso: chaveDoBarcode })),
    );

    const result = await provider.extract(INPUT);

    expect(result.status).toBe('SUCESSO');
    expect(result.data?.chaveAcesso).toBe(chaveDoBarcode);
  });

  it('tenta novamente após uma falha transitória e retorna SUCESSO na segunda tentativa', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":"overloaded"}', { status: 503 }))
      .mockResolvedValueOnce(geminiResponse(VALID_CUPOM));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider(paddleSuccess()),
    );

    const result = await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('SUCESSO');
  });

  it('desiste após esgotar as tentativas e retorna FALHA sem lançar', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('{"error":"overloaded"}', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider(paddleSuccess()),
    );

    const result = await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('FALHA');
    if (result.status === 'FALHA') {
      expect(result.erro).toBe('Falha na leitura estruturada pelo Gemini.');
    }
  });

  it('trata JSON inválido na resposta como falha retentável', async () => {
    const invalidJsonResponse = new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: '{not valid json' }] } }] }),
      { status: 200 },
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(invalidJsonResponse)
      .mockResolvedValueOnce(geminiResponse(VALID_CUPOM));
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider(paddleSuccess()),
    );

    const result = await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('SUCESSO');
  });
});

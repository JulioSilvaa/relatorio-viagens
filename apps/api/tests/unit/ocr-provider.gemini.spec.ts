import { afterEach, describe, expect, it, vi } from 'vitest';
import { GeminiOcrProvider } from '../../src/modules/ocr/ocr-provider.gemini.js';
import type {
  OcrExtractInput,
  OcrExtractionResult,
  OcrProvider,
} from '../../src/modules/ocr/ocr.types.js';

const SUFFICIENT_TEXT =
  'RESTAURANTE BOM SABOR LTDA CNPJ 12345678000199 TOTAL 47,00 FORMA DE PAGAMENTO CARTAO';

const INPUT: OcrExtractInput = {
  fileData: new Uint8Array(),
  fileType: 'image/jpeg',
  fileName: 'comprovante.jpg',
};

function fakePaddleProvider(rawText: string): OcrProvider {
  return {
    async extract(): Promise<OcrExtractionResult> {
      return { status: 'SUCESSO', data: { textoOriginal: rawText, itens: [] } };
    },
  };
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

  it('lança sem um provider auxiliar de texto', () => {
    expect(() => new GeminiOcrProvider('key', 'gemini-3.6-flash', 1000)).toThrow(
      'GeminiOcrProvider requer um provider OCR de texto auxiliar.',
    );
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
      fakePaddleProvider(SUFFICIENT_TEXT),
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
      fakePaddleProvider(SUFFICIENT_TEXT),
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
      fakePaddleProvider(SUFFICIENT_TEXT),
    );

    const result = await provider.extract(INPUT);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('SUCESSO');
  });

  it('não chama o Gemini quando o texto do OCR auxiliar é insuficiente', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const provider = new GeminiOcrProvider(
      'fake-key',
      'gemini-3.6-flash',
      5000,
      fakePaddleProvider('ab'),
    );

    const result = await provider.extract(INPUT);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.status).toBe('FALHA');
    if (result.status === 'FALHA') {
      expect(result.erro).toBe('ocr_insuficiente');
    }
  });
});

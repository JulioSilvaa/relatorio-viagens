import type { OcrExtractInput, OcrExtractionResult, OcrProvider } from './ocr.types.js';

const NEUTRAL_MESSAGE =
  'Infraestrutura de OCR/IA ainda não definida (Item pendente ESPEC-TEC §33). Preencha os dados manualmente.';

export class NeutralOcrProvider implements OcrProvider {
  async extract(_input: OcrExtractInput): Promise<OcrExtractionResult> {
    return { status: 'FALHA', erro: NEUTRAL_MESSAGE };
  }
}

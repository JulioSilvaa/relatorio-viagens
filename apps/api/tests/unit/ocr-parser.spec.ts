import { describe, expect, it } from 'vitest';
import { hasRecognizedContent, parseOcrText } from '../../src/modules/ocr/ocr-parser.js';

const CUPOM_FISCAL = `BOM APETITE LANCHES LTDA
CNPJ: 12.345.678/0001-90
Rua das Flores, 123 - Centro
CUPOM FISCAL
PDV: 001   COO: 004928
11/09/2026  14:37
1 X-COCA-COLA LATA      6,50
1 X-MISTO QUENTE       18,90
SUBTOTAL                25,40
TOTAL R$ 25,40
FORMA PGTO: DINHEIRO
VOLTAR SEMPRE`;

const NOTA_NFC_E = `MERCADO DO BAIRRO ME
CNPJ 00.111.222/0001-33
NFC-e numero 000.003.824.000.000.000.000.000.000.000.000.000.000.000.00
17/08/2026 19:02:11
PRODUTO...
TOTAL R$ 123,45
Chave de acesso acesse o site da SEFAZ`;

describe('ocr-parser', () => {
  it('extrai CNPJ formatado do cupom fiscal', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(fields.cnpj).toBe('12345678000190');
  });

  it('extrai data e hora do cupom fiscal', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(fields.data?.getFullYear()).toBe(2026);
    expect(fields.data?.getMonth()).toBe(8);
    expect(fields.data?.getDate()).toBe(11);
    expect(fields.hora).toContain('14:37');
  });

  it('extrai o valor total preferindo a linha TOTAL', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(fields.valorTotal).toBe('25.40');
  });

  it('extrai nome do estabelecimento pela primeira linha', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(fields.nomeEstabelecimento).toBe('BOM APETITE LANCHES LTDA');
  });

  it('extrai chave de acesso de NFC-e de 44 dígitos', () => {
    const fields = parseOcrText(NOTA_NFC_E);
    expect(fields.chaveAcesso).toHaveLength(44);
    expect(fields.valorTotal).toBe('123.45');
  });

  it('não inventa conteúdo em texto sem padrões', () => {
    const fields = parseOcrText('texto aleatório sem informação estruturada');
    expect(hasRecognizedContent(fields)).toBe(false);
  });

  it('considera conteúdo reconhecido se algum campo foi extraído', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(hasRecognizedContent(fields)).toBe(true);
  });
});

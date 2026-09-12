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

const CUPOM_FOTOGRAFADO = `FARMACIA SUPER POPULAR MARIANO LTDA
CNPJ: 14.739.178/0001-08
04/11/2021 16:15:12
CUPOM FISCAL
TOTAL 204,38
FORMA DE PAGAMENTO CARTAO`;

const CUPOM_COM_DESCONTO = `FARMACIA SUPER POPULAR MARIANO LTDA
04/11/2021 16:15:12
TOTAL R$ 204,38
DESCONTO R$ -21,70
* VOCE ECONOMIZOU R$ 39,22 **`;

const CUPOM_PADDLE = `COOPER
COOPERATIVA DE PRODUCAO E ABASTEC. DO VALE DO ITAJAI
RODOVIA BR 470 KM53
CNPJ: 82.647.165/0011-96
25/06/2022 11:41:01V
CUPOM FISCAL
TOTAL R$ 103.86
CARTAO CREDITO`;

const DANFE_BAHIA = `DANFE DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA
NF-e Nº 000.228.320 SÉRIE 85
Nº 000.199.281
VALOR TOTAL DOS PRODUTOS 2.499,00
VALOR DA NOTA 2.499,00`;

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

  it('compacta chave SEFAZ separada por espaços e pontos', () => {
    const fields = parseOcrText(
      'CHAVE 1234 5678 9012 3456 7890 1234 5678 9012 3456 7890 1234',
    );
    expect(fields.chaveAcesso).toHaveLength(44);
  });

  it('captura chave SEFAZ quebrada em linhas após o rótulo', () => {
    const fields = parseOcrText(`CHAVE DE ACESSO
5320 1133 0412 6011
2043 5500 0000 1992 8111 2161 3240`);
    expect(fields.chaveAcesso).toBe('53201133041260112043550000001992811121613240');
  });

  it('extrai total sem o prefixo R$ em cupom fotografado', () => {
    const fields = parseOcrText(CUPOM_FOTOGRAFADO);
    expect(fields.nomeEstabelecimento).toBe('FARMACIA SUPER POPULAR MARIANO LTDA');
    expect(fields.valorTotal).toBe('204.38');
  });

  it('ignora economia e desconto ao escolher o total', () => {
    expect(parseOcrText(CUPOM_COM_DESCONTO).valorTotal).toBe('204.38');
  });

  it('prioriza total em linha separada e ignora subtotal', () => {
    const fields = parseOcrText(`SUBTOTAL 39,22\nTOTAL..\n204,38\nECONOMIZOU R$ 39,22`);
    expect(fields.valorTotal).toBe('204.38');
  });

  it('aceita decimal com ponto e combina linhas do estabelecimento', () => {
    const fields = parseOcrText(CUPOM_PADDLE);
    expect(fields.valorTotal).toBe('103.86');
    expect(fields.data?.getFullYear()).toBe(2022);
    expect(fields.nomeEstabelecimento).toContain('COOPERATIVA DE PRODUCAO');
  });

  it('extrai número do documento a partir do rótulo fiscal', () => {
    expect(parseOcrText(DANFE_BAHIA).numeroDocumento).toBe('000228320');
  });

  it('extrai valor fiscal sem R$ a partir do valor da nota', () => {
    expect(parseOcrText(DANFE_BAHIA).valorTotal).toBe('2499.00');
  });

  it('captura identificadores e valores fiscais complementares', () => {
    const fields = parseOcrText(`
      SÉRIE 85
      INSCRIÇÃO ESTADUAL: 123.456.789.012
      VALOR TOTAL DOS PRODUTOS 2.499,00
      DESCONTO 10,00
      TRIBUTOS TOTAIS 345,02
      FORMA DE PAGAMENTO: CARTÃO DE CRÉDITO
      PROTOCOLO DE AUTORIZAÇÃO: 135240000000000
    `);
    expect(fields.serie).toBe('85');
    expect(fields.inscricaoEstadual).toBe('123.456.789.012');
    expect(fields.valorProdutos).toBe('2499.00');
    expect(fields.desconto).toBe('10.00');
    expect(fields.tributos).toBe('345.02');
    expect(fields.formaPagamento).toBe('CARTÃO DE CRÉDITO');
    expect(fields.protocoloAutorizacao).toBe('135240000000000');
  });

  it('não trata sequência numérica sem rótulo como CNPJ', () => {
    const fields = parseOcrText('Código de barras 53201133041260\nIDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR');
    expect(fields.cnpj).toBeUndefined();
  });

  it('não retorna NaN quando o OCR encontra valor inválido', () => {
    const fields = parseOcrText('VALOR TOTAL NaN\nNOTA FISCAL');
    expect(fields.valorTotal).not.toBe('NaN');
    expect(fields.valorTotal).toBeUndefined();
  });

  it('não inventa conteúdo em texto sem padrões', () => {
    const fields = parseOcrText('texto aleatório sem informação estruturada');
    expect(hasRecognizedContent(fields)).toBe(false);
  });

  it('considera conteúdo reconhecido se algum campo foi extraído', () => {
    const fields = parseOcrText(CUPOM_FISCAL);
    expect(hasRecognizedContent(fields)).toBe(true);
  });

  it('não considera uma data isolada como OCR útil', () => {
    expect(hasRecognizedContent(parseOcrText('04/11/2021'))).toBe(false);
  });
});

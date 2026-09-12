import PDFDocument from 'pdfkit';
import type { PdfAttachment, ReportData } from './report.types.js';

type Doc = InstanceType<typeof PDFDocument>;

const PAGE_WIDTH = 595.28;
const MARGIN = 44;
const CONTENT_TOP = 102;
const CONTENT_BOTTOM = 770;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: '#17212b', muted: '#5f6b76', teal: '#0f5c63', tealSoft: '#e5f1f0',
  blueSoft: '#eaf1f7', line: '#cbd5dc', faint: '#f4f7f8', paper: '#ffffff', warning: '#a44a16', white: '#ffffff',
};

interface Column { title: string; width: number; align?: 'left' | 'right'; }
interface PageContext { title: string; subtitle: string; emittedAt: Date; emittedBy: string; version: number; }

function brl(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
}

function dateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function cleanStatus(status: string): string { return status.replaceAll('_', ' '); }

function render(content: (doc: Doc) => void, context: PageContext): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, pdfVersion: '1.7', bufferPages: true, info: { Title: context.title, Author: 'VIAFLOW' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    content(doc);
    renderPageChrome(doc, context);
    doc.end();
  });
}

function renderPageChrome(doc: Doc, context: PageContext): void {
  const { start, count } = doc.bufferedPageRange();
  for (let index = start; index < start + count; index += 1) {
    doc.switchToPage(index);
    doc.rect(0, 0, PAGE_WIDTH, 72).fill(COLORS.ink);
    doc.rect(0, 72, PAGE_WIDTH, 4).fill(COLORS.teal);
    doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.white).text('VIAFLOW', MARGIN, 22, { lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor('#c8d6db').text(context.subtitle, MARGIN, 43, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.white).text(context.title, MARGIN, 25, { width: CONTENT_WIDTH, align: 'right', lineBreak: false });
    doc.moveTo(MARGIN, 775).lineTo(PAGE_WIDTH - MARGIN, 775).lineWidth(0.5).strokeColor(COLORS.line).stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted).text(
      `Emitido em ${dateBR(context.emittedAt)} às ${context.emittedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${context.emittedBy} · Versão ${context.version}`,
      MARGIN, 782, { width: CONTENT_WIDTH - 70, lineBreak: false },
    );
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted).text(`PÁGINA ${index + 1}`, PAGE_WIDTH - MARGIN - 70, 782, { width: 70, align: 'right', lineBreak: false });
  }
}

function newPage(doc: Doc): void { doc.addPage(); doc.y = CONTENT_TOP; }
function ensureSpace(doc: Doc, height: number): void { if (doc.y + height > CONTENT_BOTTOM) newPage(doc); }

function sectionTitle(doc: Doc, title: string, note?: string): void {
  ensureSpace(doc, 34);
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text(title, MARGIN, y, { width: 290, lineBreak: false });
  if (note) doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(note, PAGE_WIDTH - MARGIN - 190, y + 2, { width: 190, align: 'right', lineBreak: false });
  doc.moveTo(MARGIN, y + 20).lineTo(PAGE_WIDTH - MARGIN, y + 20).lineWidth(1).strokeColor(COLORS.teal).stroke();
  doc.y = y + 28;
}

function fieldGrid(doc: Doc, fields: Array<{ label: string; value: string }>, columns = 2): void {
  const gap = 12;
  const columnWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  for (let index = 0; index < fields.length; index += columns) {
    const row = fields.slice(index, index + columns);
    const height = Math.max(38, ...row.map((field) => doc.heightOfString(field.value || '-', { width: columnWidth - 16, lineGap: 1 }) + 24));
    ensureSpace(doc, height + 6);
    const y = doc.y;
    for (let offset = 0; offset < row.length; offset += 1) {
      const field = row[offset];
      if (!field) continue;
      const x = MARGIN + offset * (columnWidth + gap);
      doc.rect(x, y, columnWidth, height).fill(COLORS.faint);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted).text(field.label.toUpperCase(), x + 8, y + 7, { width: columnWidth - 16 });
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.ink).text(field.value || '-', x + 8, y + 19, { width: columnWidth - 16, lineGap: 1 });
    }
    doc.y = y + height + 6;
  }
}

function summaryBand(doc: Doc, data: ReportData): void {
  const tiles = [
    { label: 'DESPESAS LANÇADAS', value: brl(data.totalDespesas), tone: COLORS.teal },
    { label: 'TOTAL REEMBOLSÁVEL', value: brl(data.totalReembolsavel), tone: '#315a7d' },
    { label: 'COMPROVANTES', value: String(data.ocr.totalComprovantes), tone: COLORS.warning },
  ];
  const gap = 8; const width = (CONTENT_WIDTH - gap * 2) / 3;
  ensureSpace(doc, 65);
  const y = doc.y;
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index]; if (!tile) continue;
    const x = MARGIN + index * (width + gap);
    doc.rect(x, y, width, 58).fill(tile.tone);
    doc.font('Helvetica-Bold').fontSize(7).fillColor('#dce9eb').text(tile.label, x + 9, y + 10, { width: width - 18 });
    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLORS.white).text(tile.value, x + 9, y + 27, { width: width - 18 });
  }
  doc.y = y + 72;
}

function maskCard(last4: string | null, brand: string | null): string { return last4 ? `${brand ?? 'Cartão'} · •••• ${last4}` : 'Não vinculado'; }

function drawTableHeader(doc: Doc, columns: Column[]): void {
  ensureSpace(doc, 25);
  const y = doc.y; let x = MARGIN;
  doc.rect(MARGIN, y, CONTENT_WIDTH, 19).fill(COLORS.ink);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.white);
  for (const column of columns) { doc.text(column.title.toUpperCase(), x + 5, y + 6, { width: column.width - 10, align: column.align ?? 'left' }); x += column.width; }
  doc.y = y + 19;
}

function drawTableRow(doc: Doc, columns: Column[], cells: string[], rowIndex: number, emphasized = false): boolean {
  const padding = 6;
  doc.font(emphasized ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.2);
  const height = Math.max(22, ...columns.map((column, index) => doc.heightOfString(cells[index] ?? '-', { width: column.width - padding * 2, lineGap: 1 }) + padding * 2));
  if (doc.y + height > CONTENT_BOTTOM) return false;
  const y = doc.y; let x = MARGIN;
  if (emphasized) doc.rect(MARGIN, y, CONTENT_WIDTH, height).fill(COLORS.tealSoft);
  else if (rowIndex % 2 === 1) doc.rect(MARGIN, y, CONTENT_WIDTH, height).fill(COLORS.faint);
  doc.fillColor(COLORS.ink);
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index]; if (!column) continue;
    doc.text(cells[index] ?? '-', x + padding, y + padding, { width: column.width - padding * 2, align: column.align ?? 'left', lineGap: 1 }); x += column.width;
  }
  doc.moveTo(MARGIN, y + height).lineTo(PAGE_WIDTH - MARGIN, y + height).lineWidth(0.35).strokeColor(COLORS.line).stroke();
  doc.y = y + height;
  return true;
}

function renderTable(doc: Doc, columns: Column[], rows: string[][], total?: string[]): void {
  drawTableHeader(doc, columns);
  let rowIndex = 0;
  for (const row of rows) {
    if (!drawTableRow(doc, columns, row, rowIndex)) { newPage(doc); drawTableHeader(doc, columns); drawTableRow(doc, columns, row, rowIndex); }
    rowIndex += 1;
  }
  if (total && !drawTableRow(doc, columns, total, rowIndex, true)) { newPage(doc); drawTableHeader(doc, columns); drawTableRow(doc, columns, total, rowIndex, true); }
  doc.y += 10;
}

function tripInfo(doc: Doc, data: ReportData): void {
  const trip = data.trip;
  const kmPercorridos = trip.kmInicial !== null && trip.kmFinal !== null
    ? Number(trip.kmFinal) - Number(trip.kmInicial)
    : null;
  const valorReembolsoKm = kmPercorridos !== null && Number.isFinite(kmPercorridos) && trip.taxaKm
    ? (kmPercorridos * Number(trip.taxaKm)).toFixed(2)
    : null;
  sectionTitle(doc, 'Visão geral da viagem', 'CONTEXTO E RESPONSABILIDADE');
  summaryBand(doc, data);
  fieldGrid(doc, [
    { label: 'Cliente', value: trip.cliente }, { label: 'Status', value: cleanStatus(trip.status) },
    { label: 'Destino', value: `${trip.cidade}/${trip.uf}` }, { label: 'Período', value: `${dateBR(trip.dataSaida)} a ${dateBR(trip.dataRetorno)}` },
    { label: 'Departamento', value: trip.departamento }, { label: 'Centro de custo', value: trip.centroDeCusto ?? '-' },
    { label: 'Motivo', value: trip.motivo }, { label: 'Veículo', value: trip.tipoVeiculo ? `${trip.tipoVeiculo}${trip.veiculo ? ` · ${trip.veiculo}` : ''}` : (trip.veiculo ?? '-') },
    { label: 'Placa', value: trip.placa ?? '-' }, { label: 'Quilometragem', value: trip.kmInicial !== null && trip.kmFinal !== null ? `${trip.kmInicial} km a ${trip.kmFinal} km (${kmPercorridos} km rodados)` : '-' },
    { label: 'Taxa de reembolso por km', value: trip.taxaKm ? brl(trip.taxaKm) : '-' },
    { label: 'Valor do reembolso por km', value: valorReembolsoKm ? brl(valorReembolsoKm) : '-' },
  ]);
  if (trip.observacoes) fieldGrid(doc, [{ label: 'Observações', value: trip.observacoes }], 1);
}

function renderParticipantes(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Participantes', 'PESSOAS E CARTÕES VINCULADOS');
  renderTable(doc, [{ title: 'Participante', width: 310 }, { title: 'Cartão corporativo', width: CONTENT_WIDTH - 310 }], data.participantes.map((participant) => [participant.nome, maskCard(participant.cartaoLast4, participant.cartaoBandeira)]));
}

function renderDespesas(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Despesas', 'LANÇAMENTOS E EXCEÇÕES');
  const columns: Column[] = [
    { title: 'Data', width: 50 }, { title: 'Categoria', width: 95 }, { title: 'Responsável', width: 78 }, { title: 'Descrição', width: 139 },
    { title: 'Reemb.', width: 43, align: 'right' }, { title: 'Alerta', width: 42 }, { title: 'Valor', width: 60, align: 'right' },
  ];
  renderTable(doc, columns, data.despesas.map((expense) => [dateBR(expense.dataDespesa), expense.categoria, expense.autor, expense.justificativa, expense.reembolsavel ? 'Sim' : 'Não', expense.alertaExcesso ? 'Revisar' : '—', brl(expense.valor)]), ['', 'TOTAL', '', '', '', '', brl(data.totalDespesas)]);
}

function renderOcrSummary(doc: Doc, data: ReportData): void {
  const ocr = data.ocr;
  sectionTitle(doc, 'Conferência de comprovantes', 'COBERTURA E RASTREABILIDADE');
  fieldGrid(doc, [
    { label: 'Comprovantes anexados', value: String(ocr.totalComprovantes) }, { label: 'Processados por OCR', value: String(ocr.comOcr) },
    { label: 'Lançados manualmente', value: String(ocr.manual) }, { label: 'Pendentes de OCR', value: String(ocr.pendentes) },
    { label: 'Falhas de OCR', value: String(ocr.falhas) }, { label: 'Valor extraído pela IA', value: brl(ocr.valorExtraidoTotal) },
  ]);
  if (ocr.chavesAcesso.length > 0) fieldGrid(doc, [{ label: 'Chaves de acesso SEFAZ', value: ocr.chavesAcesso.join('\n') }], 1);
}

function drawStructuredPanel(doc: Doc, fields: ReportData['ocrDetalhes'][number]['structured'], x: number, y: number, width: number, height: number): void {
  const padding = 10;
  doc.rect(x, y, width, height).fill(COLORS.paper).lineWidth(0.7).strokeColor(COLORS.line).stroke();
  doc.rect(x, y, width, 27).fill(COLORS.ink);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white).text('DADOS EXTRAÍDOS', x + padding, y + 9, { width: width - padding * 2, lineBreak: false });

  const hasData = Boolean(
    fields.nomeEstabelecimento || fields.cnpj || fields.endereco || fields.valorTotal
    || fields.valorProdutos || fields.subtotal || fields.desconto || fields.tributos
    || fields.numeroDocumento || fields.formaPagamento || fields.chaveAcesso
    || fields.itens.length,
  );
  if (!hasData) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.warning).text('Extração precisa de revisão manual', x + padding, y + 52, { width: width - padding * 2 });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text('Os dados estruturados não estão disponíveis para este comprovante.', x + padding, y + 76, { width: width - padding * 2, lineGap: 2 });
    return;
  }

  let cursor = y + 43;
  const line = (label: string, value: string | null, strong = false) => {
    if (!value) return;
    const valueWidth = width - padding * 2;
    const valueFontSize = strong ? 11 : 8.5;
    doc.font('Helvetica-Bold').fontSize(7);
    const labelHeight = doc.heightOfString(label.toUpperCase(), { width: valueWidth, lineGap: 1 });
    doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(valueFontSize);
    const valueHeight = doc.heightOfString(value, { width: valueWidth, lineGap: 1 });
    const nextCursor = cursor + labelHeight + valueHeight + 7;
    if (nextCursor > y + height - 72) return;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted).text(label.toUpperCase(), x + padding, cursor, { width: valueWidth, lineGap: 1 });
    cursor += labelHeight + 1;
    doc.font(strong ? 'Helvetica-Bold' : 'Helvetica').fontSize(valueFontSize).fillColor(COLORS.ink).text(value, x + padding, cursor, { width: valueWidth, lineGap: 1 });
    cursor = nextCursor;
  };
  line('Estabelecimento', fields.nomeEstabelecimento, true);
  line('CNPJ', fields.cnpj);
  line('Endereço', fields.endereco);
  line('Documento', fields.numeroDocumento);
  line('Data e hora', [fields.data ? dateBR(new Date(fields.data)) : null, fields.hora].filter(Boolean).join(' '));
  if (fields.itens.length > 0) {
    doc.moveTo(x + padding, cursor).lineTo(x + width - padding, cursor).lineWidth(0.6).strokeColor(COLORS.teal).stroke();
    cursor += 9;
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted).text('ITENS', x + padding, cursor, { width: width - padding * 2, lineBreak: false });
    cursor += 13;
    for (const item of fields.itens.slice(0, 8)) {
      const description = item.descricao.length > 28 ? `${item.descricao.slice(0, 25)}...` : item.descricao;
      const quantity = item.quantidade === null ? '—' : String(item.quantidade);
      const total = item.valorTotal === null ? '—' : brl(item.valorTotal.toFixed(2));
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.ink).text(`${quantity} ${item.unidade ?? ''} ${description}`.trim(), x + padding, cursor, { width: width - 72, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.ink).text(total, x + width - padding - 62, cursor, { width: 62, align: 'right', lineBreak: false });
      cursor += 13;
      if (cursor > y + height - 95) break;
    }
  }
  line('Subtotal', fields.subtotal);
  line('Produtos', fields.valorProdutos);
  line('Desconto', fields.desconto);
  line('Tributos', fields.tributos);
  line('Pagamento', fields.formaPagamento);
  line('Protocolo', fields.protocoloAutorizacao);
  const total = fields.valorTotal ? brl(fields.valorTotal) : null;
  if (total) {
    doc.moveTo(x + padding, y + height - 58).lineTo(x + width - padding, y + height - 58).lineWidth(0.6).strokeColor(COLORS.line).stroke();
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted).text('TOTAL DO COMPROVANTE', x + padding, y + height - 45, { width: width - 100, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.teal).text(total, x + width - padding - 100, y + height - 49, { width: 100, align: 'right', lineBreak: false });
  }
  if (fields.chaveAcesso && /^\d{44}$/.test(fields.chaveAcesso)) {
    doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.muted).text(`Chave SEFAZ: ${fields.chaveAcesso}`, x + padding, y + height - 24, { width: width - padding * 2, lineBreak: false });
  }
}

function drawReceiptImagePanel(doc: Doc, attachment: PdfAttachment | undefined, x: number, y: number, width: number, height: number): void {
  const padding = 10;
  const headerHeight = 27;
  doc.rect(x, y, width, height).fill(COLORS.paper).lineWidth(0.7).strokeColor(COLORS.line).stroke();
  doc.rect(x, y, width, headerHeight).fill(COLORS.teal);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.white).text('IMAGEM DO COMPROVANTE', x + padding, y + 9, { width: width - padding * 2, lineBreak: false });
  if (!attachment) {
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text('Imagem não disponível.', x + padding, y + height / 2, { width: width - padding * 2, align: 'center' });
    return;
  }
  try {
    doc.image(Buffer.from(attachment.data), x + padding, y + headerHeight + padding, { fit: [width - padding * 2, height - headerHeight - padding * 2], align: 'center', valign: 'center' });
  } catch {
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text('Comprovante em formato não suportado para exibição.', x + padding, y + height / 2 - 10, { width: width - padding * 2, align: 'center' });
  }
}

function renderOcrDetails(doc: Doc, data: ReportData, attachments: PdfAttachment[]): Set<string> {
  const rendered = new Set<string>();
  if (data.ocrDetalhes.length === 0) return rendered;
  ensureSpace(doc, 34 + 29 + 535);
  sectionTitle(doc, 'Dados dos comprovantes', 'DADOS ESTRUTURADOS DA EXTRAÇÃO');
  for (const [index, item] of data.ocrDetalhes.entries()) {
    ensureSpace(doc, 535);
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text(`Comprovante ${index + 1}`, MARGIN, y, { width: 180, lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(item.categoria, MARGIN + 188, y + 2, { width: 130, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted).text(item.fileName, PAGE_WIDTH - MARGIN - 180, y + 2, { width: 180, align: 'right', lineBreak: false });
    doc.moveTo(MARGIN, y + 20).lineTo(PAGE_WIDTH - MARGIN, y + 20).lineWidth(1).strokeColor(COLORS.teal).stroke();
    doc.y = y + 29;
    const panelY = doc.y;
    const panelHeight = 470;
    const imageWidth = 245;
    const textWidth = CONTENT_WIDTH - imageWidth - 12;
    const attachment = attachments.find((candidate) => item.fileHash
      ? candidate.fileHash === item.fileHash
      : candidate.receiptId === item.receiptId);
    drawReceiptImagePanel(doc, attachment, MARGIN, panelY, imageWidth, panelHeight);
    drawStructuredPanel(doc, item.structured, MARGIN + imageWidth + 12, panelY, textWidth, panelHeight);
    if (attachment) rendered.add(attachment.fileHash || `receipt:${attachment.receiptId}`);
    doc.y = panelY + panelHeight + 10;
    doc.moveTo(MARGIN, doc.y).lineTo(PAGE_WIDTH - MARGIN, doc.y).lineWidth(1).strokeColor(COLORS.line).stroke(); doc.y += 10;
  }
  return rendered;
}

function renderFinanceiro(doc: Doc, data: ReportData): void {
  const financeiro = data.financeiro;
  const rows = [
    ...financeiro.adiantamentos.map((record) => ['Adiantamento', dateBR(record.data), record.responsavel, '-', brl(record.valor)]),
    ...financeiro.reembolsos.map((record) => ['Reembolso', dateBR(record.data), record.responsavel, record.comprovanteNome ?? '-', brl(record.valor)]),
    ...financeiro.devolucoes.map((record) => ['Devolução', dateBR(record.data), record.responsavel, record.comprovanteNome ?? '-', brl(record.valor)]),
  ];
  sectionTitle(doc, 'Movimentações financeiras', 'ADIANTAMENTOS, PAGAMENTOS E DEVOLUÇÕES');
  if (rows.length === 0) { fieldGrid(doc, [{ label: 'Situação financeira', value: 'Nenhuma movimentação financeira registrada.' }], 1); return; }
  const columns: Column[] = [{ title: 'Tipo', width: 103 }, { title: 'Data', width: 62 }, { title: 'Responsável', width: 112 }, { title: 'Comprovante', width: 140 }, { title: 'Valor', width: CONTENT_WIDTH - 417, align: 'right' }];
  renderTable(doc, columns, rows, ['PAGAMENTOS', '', '', '', brl(financeiro.totalReembolsos)]);
  fieldGrid(doc, [{ label: 'Total de adiantamentos', value: brl(financeiro.totalAdiantamentos) }, { label: 'Total de devoluções', value: brl(financeiro.totalDevolucoes) }]);
}

function attachComprovantes(doc: Doc, attachments: PdfAttachment[]): void {
  for (const [index, attachment] of attachments.slice(0, 10).entries()) {
    newPage(doc);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.ink).text('Comprovante anexado');
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted).text(`Anexo ${index + 1} de ${Math.min(attachments.length, 10)} · ${attachment.fileName}`);
    doc.moveTo(MARGIN, doc.y + 7).lineTo(PAGE_WIDTH - MARGIN, doc.y + 7).lineWidth(1).strokeColor(COLORS.teal).stroke(); doc.y += 18;
    try { doc.image(Buffer.from(attachment.data), MARGIN, doc.y, { fit: [CONTENT_WIDTH, 620], align: 'center', valign: 'center' }); }
    catch { doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 90).fill(COLORS.faint); doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted).text('Comprovante em formato não suportado para exibição.', MARGIN + 12, doc.y + 39, { width: CONTENT_WIDTH - 24, align: 'center' }); }
  }
}

function reportContext(data: ReportData, title: string, subtitle: string): PageContext { return { title, subtitle, emittedAt: data.emitidoEm, emittedBy: data.emitidoPor, version: data.versao }; }

export async function renderOfficialPdf(data: ReportData, options: { attachments: PdfAttachment[] }): Promise<Buffer> {
  return render((doc) => { doc.y = CONTENT_TOP; tripInfo(doc, data); renderParticipantes(doc, data); renderDespesas(doc, data); renderOcrSummary(doc, data); const paired = renderOcrDetails(doc, data, options.attachments); renderFinanceiro(doc, data); const remaining = options.attachments.filter((attachment) => !paired.has(attachment.fileHash || `receipt:${attachment.receiptId}`)); if (remaining.length > 0) attachComprovantes(doc, remaining); }, reportContext(data, 'RELATÓRIO OFICIAL DE VIAGEM', 'Prestação de contas e conferência documental'));
}

export async function renderManagerPdf(data: ReportData, options: { attachments: PdfAttachment[] }): Promise<Buffer> {
  return render((doc) => { doc.y = CONTENT_TOP; tripInfo(doc, data); renderParticipantes(doc, data); renderDespesas(doc, data); const paired = renderOcrDetails(doc, data, options.attachments); const remaining = options.attachments.filter((attachment) => !paired.has(attachment.fileHash || `receipt:${attachment.receiptId}`)); if (remaining.length > 0) attachComprovantes(doc, remaining); }, reportContext(data, 'RESUMO GERENCIAL DE VIAGEM', 'Custos, participantes e documentos vinculados'));
}
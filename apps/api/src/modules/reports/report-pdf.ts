import PDFDocument from 'pdfkit';
import type { PdfAttachment, ReportData } from './report.types.js';

type Doc = InstanceType<typeof PDFDocument>;

const PAGE_WIDTH = 595.28;
const MARGIN = 44;
const CONTENT_TOP = 82;
const CONTENT_BOTTOM = 770;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  ink: '#17212b',
  muted: '#5b6670',
  faded: '#8a949c',
  teal: '#0f5c63',
  tealSoft: '#eaf2f1',
  line: '#c7cfd6',
  faint: '#f6f8f9',
  warning: '#a44a16',
  paper: '#ffffff',
};

interface Column {
  title: string;
  width: number;
  align?: 'left' | 'right';
}
interface PageContext {
  title: string;
  subtitle: string;
  emittedAt: Date;
  emittedBy: string;
  version: number;
  status: string;
}

const FONT = {
  regular: 'Helvetica',
  bold: 'Helvetica-Bold',
  mono: 'Courier',
  monobold: 'Courier-Bold',
};

function brl(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
}

function dateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function cleanStatus(status: string): string {
  return status.replaceAll('_', ' ');
}

function isUuid(value: string | null): boolean {
  return (
    value !== null && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function accessKeyDisplay(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 44) return value;
  return digits.match(/.{1,4}/g)?.join(' ') ?? value;
}

function render(content: (doc: Doc) => void, context: PageContext): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      pdfVersion: '1.7',
      bufferPages: true,
      info: { Title: context.title, Author: 'vaiefecha' },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    content(doc);
    renderPageChrome(doc, context);
    doc.end();
  });
}

const HEADER_RIGHT_WIDTH = 190;
const HEADER_COLUMN_GAP = 14;
const HEADER_LEFT_WIDTH = CONTENT_WIDTH - HEADER_RIGHT_WIDTH - HEADER_COLUMN_GAP;
const HEADER_RIGHT_X = PAGE_WIDTH - MARGIN - HEADER_RIGHT_WIDTH;

function renderPageChrome(doc: Doc, context: PageContext): void {
  const { start, count } = doc.bufferedPageRange();
  for (let index = start; index < start + count; index += 1) {
    doc.switchToPage(index);

    // Left column (brand/title/subtitle) and right column (version/status) are two
    // independent stacks capped to their own width, with a fixed gap between them —
    // stacking them on shared y-coordinates without a width cap previously let the
    // subtitle and "Status" lines render on top of each other on the right edge.
    doc
      .font(FONT.bold)
      .fontSize(13)
      .fillColor(COLORS.ink)
      .text('vaiefecha', MARGIN, 20, { lineBreak: false });
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted).text(context.title, MARGIN, 37, {
      width: HEADER_LEFT_WIDTH,
      characterSpacing: 1.2,
      lineBreak: false,
    });
    doc.font(FONT.regular).fontSize(7).fillColor(COLORS.muted).text(context.subtitle, MARGIN, 47, {
      width: HEADER_LEFT_WIDTH,
      characterSpacing: 0.6,
      lineBreak: false,
    });

    doc
      .font(FONT.bold)
      .fontSize(8)
      .fillColor(COLORS.ink)
      .text(`Nº ${context.version} · ${dateBR(context.emittedAt)}`, HEADER_RIGHT_X, 20, {
        width: HEADER_RIGHT_WIDTH,
        align: 'right',
        lineBreak: false,
      });
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.muted)
      .text(`Status · ${cleanStatus(context.status)}`, HEADER_RIGHT_X, 33, {
        width: HEADER_RIGHT_WIDTH,
        align: 'right',
        characterSpacing: 0.6,
        lineBreak: false,
      });

    doc
      .moveTo(MARGIN, 58)
      .lineTo(PAGE_WIDTH - MARGIN, 58)
      .lineWidth(1.4)
      .strokeColor(COLORS.teal)
      .stroke();
    doc
      .moveTo(MARGIN, 60)
      .lineTo(PAGE_WIDTH - MARGIN, 60)
      .lineWidth(0.4)
      .strokeColor(COLORS.line)
      .stroke();

    doc
      .moveTo(MARGIN, CONTENT_BOTTOM + 10)
      .lineTo(PAGE_WIDTH - MARGIN, CONTENT_BOTTOM + 10)
      .lineWidth(0.5)
      .strokeColor(COLORS.line)
      .stroke();
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text(
        `Emitido em ${dateBR(context.emittedAt)} às ${context.emittedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${context.emittedBy} · Versão ${context.version}`,
        MARGIN,
        CONTENT_BOTTOM + 16,
        { width: CONTENT_WIDTH - 70, lineBreak: false },
      );
    doc
      .font(FONT.bold)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text(`PÁGINA ${index + 1}`, PAGE_WIDTH - MARGIN - 70, CONTENT_BOTTOM + 16, {
        width: 70,
        align: 'right',
        characterSpacing: 0.8,
        lineBreak: false,
      });
  }
}

function newPage(doc: Doc): void {
  doc.addPage();
  doc.y = CONTENT_TOP;
}
function ensureSpace(doc: Doc, height: number): void {
  if (doc.y + height > CONTENT_BOTTOM) newPage(doc);
}

// minContentHeight keeps the title glued to at least the start of its body:
// checking only the title's own 34pt let a section title fit at the bottom
// of a page while its content immediately broke to the next one, leaving an
// orphaned heading followed by an almost-blank page.
function sectionTitle(doc: Doc, title: string, note?: string, minContentHeight = 0): void {
  ensureSpace(doc, 34 + minContentHeight);
  const y = doc.y;
  doc
    .font(FONT.bold)
    .fontSize(10.5)
    .fillColor(COLORS.ink)
    .text(title, MARGIN, y, { width: 300, lineBreak: false });
  if (note)
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text(note, PAGE_WIDTH - MARGIN - 180, y + 3, {
        width: 180,
        align: 'right',
        characterSpacing: 0.6,
        lineBreak: false,
      });
  doc
    .moveTo(MARGIN, y + 18)
    .lineTo(PAGE_WIDTH - MARGIN, y + 18)
    .lineWidth(0.7)
    .strokeColor(COLORS.teal)
    .stroke();
  doc.y = y + 26;
}

function smallCapsLabel(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  color = COLORS.muted,
  align: 'left' | 'right' = 'left',
): void {
  doc
    .font(FONT.regular)
    .fontSize(6.4)
    .fillColor(color)
    .text(text, x, y, { width, align, characterSpacing: 0.9, lineBreak: false });
}

function balanceStrip(doc: Doc, cells: Array<{ label: string; value: string }>): void {
  const height = 46;
  ensureSpace(doc, height + 10);
  const y = doc.y;
  doc.rect(MARGIN, y, CONTENT_WIDTH, height).lineWidth(0.6).strokeColor(COLORS.line).stroke();
  const cellWidth = CONTENT_WIDTH / cells.length;
  cells.forEach((cell, index) => {
    if (index > 0) {
      doc
        .moveTo(MARGIN + cellWidth * index, y + 8)
        .lineTo(MARGIN + cellWidth * index, y + height - 8)
        .lineWidth(0.4)
        .strokeColor(COLORS.line)
        .stroke();
    }
    const x = MARGIN + cellWidth * index;
    smallCapsLabel(doc, cell.label, x + 10, y + 9, cellWidth - 20);
    doc
      .font(FONT.bold)
      .fontSize(11.5)
      .fillColor(COLORS.ink)
      .text(cell.value, x + 10, y + 22, {
        width: cellWidth - 20,
        align: 'right',
        lineBreak: false,
      });
  });
  doc.y = y + height + 10;
}

function ledgerFields(
  doc: Doc,
  fields: Array<{ label: string; value: string }>,
  single = false,
): void {
  const columns = single ? 1 : 2;
  const gap = 18;
  const columnWidth = (CONTENT_WIDTH - gap * (columns - 1)) / columns;
  const labelWidth = 116;
  for (let index = 0; index < fields.length; index += columns) {
    const row = fields.slice(index, index + columns);
    const heights = row.map((field) => {
      doc.font(FONT.regular).fontSize(9);
      return Math.max(
        30,
        doc.heightOfString(field.value || '—', {
          width: columnWidth - labelWidth - 6,
          lineGap: 1,
        }) + 20,
      );
    });
    const height = Math.max(...heights);
    ensureSpace(doc, height + 8);
    const y = doc.y;
    row.forEach((field, offset) => {
      if (!field) return;
      const x = MARGIN + offset * (columnWidth + gap);
      smallCapsLabel(doc, field.label.toUpperCase(), x, y + 7, columnWidth);
      doc
        .font(FONT.regular)
        .fontSize(9)
        .fillColor(COLORS.ink)
        .text(field.value || '—', x + labelWidth, y + 6, {
          width: columnWidth - labelWidth - 6,
          lineGap: 1,
        });
      doc
        .moveTo(x, y + height)
        .lineTo(x + columnWidth, y + height)
        .lineWidth(0.4)
        .strokeColor(COLORS.line)
        .stroke();
    });
    doc.y = y + height + 5;
  }
}

function maskCard(last4: string | null, brand: string | null): string {
  return last4 ? `${brand ?? 'Cartão'} · •••• ${last4}` : 'Sem cartão vinculado';
}

function drawTableHeader(doc: Doc, columns: Column[]): void {
  ensureSpace(doc, 26);
  const y = doc.y;
  doc
    .moveTo(MARGIN, y)
    .lineTo(PAGE_WIDTH - MARGIN, y)
    .lineWidth(0.7)
    .strokeColor(COLORS.ink)
    .stroke();
  let x = MARGIN;
  for (const column of columns) {
    smallCapsLabel(
      doc,
      column.title.toUpperCase(),
      x,
      y + 5,
      column.width,
      COLORS.muted,
      column.align === 'right' ? 'right' : 'left',
    );
    x += column.width;
  }
  doc
    .moveTo(MARGIN, y + 15)
    .lineTo(PAGE_WIDTH - MARGIN, y + 15)
    .lineWidth(0.4)
    .strokeColor(COLORS.line)
    .stroke();
  doc.y = y + 15;
}

function drawTableRow(
  doc: Doc,
  columns: Column[],
  cells: string[],
  rowIndex: number,
  emphasized = false,
): boolean {
  const padding = 6;
  doc.font(FONT.regular).fontSize(8.2);
  const height = Math.max(
    21,
    ...columns.map(
      (column, index) =>
        doc.heightOfString(cells[index] ?? '—', { width: column.width - padding * 2, lineGap: 1 }) +
        padding * 2,
    ),
  );
  if (doc.y + height > CONTENT_BOTTOM) return false;
  const y = doc.y;
  let x = MARGIN;
  if (emphasized) {
    doc
      .moveTo(MARGIN, y)
      .lineTo(PAGE_WIDTH - MARGIN, y)
      .lineWidth(0.7)
      .strokeColor(COLORS.ink)
      .stroke();
  } else if (rowIndex % 2 === 1) {
    doc.rect(MARGIN, y, CONTENT_WIDTH, height).fill(COLORS.faint);
  }
  doc
    .font(emphasized ? FONT.bold : FONT.regular)
    .fontSize(8.2)
    .fillColor(COLORS.ink);
  for (let index = 0; index < columns.length; index += 1) {
    const column = columns[index];
    if (!column) continue;
    doc.text(cells[index] ?? '—', x + padding, y + (emphasized ? 4 : padding), {
      width: column.width - padding * 2,
      align: column.align ?? 'left',
      lineGap: 1,
    });
    x += column.width;
  }
  doc
    .moveTo(MARGIN, y + height)
    .lineTo(PAGE_WIDTH - MARGIN, y + height)
    .lineWidth(0.3)
    .strokeColor(COLORS.line)
    .stroke();
  doc.y = y + height;
  return true;
}

function renderTable(doc: Doc, columns: Column[], rows: string[][], total?: string[]): void {
  drawTableHeader(doc, columns);
  let rowIndex = 0;
  for (const row of rows) {
    if (!drawTableRow(doc, columns, row, rowIndex)) {
      newPage(doc);
      drawTableHeader(doc, columns);
      drawTableRow(doc, columns, row, rowIndex);
    }
    rowIndex += 1;
  }
  if (total && !drawTableRow(doc, columns, total, rowIndex, true)) {
    newPage(doc);
    drawTableHeader(doc, columns);
    drawTableRow(doc, columns, total, rowIndex, true);
  }
  doc.y += 10;
}

function tripInfo(doc: Doc, data: ReportData): void {
  const trip = data.trip;
  const kmPercorridos =
    trip.kmInicial !== null && trip.kmFinal !== null
      ? Number(trip.kmFinal) - Number(trip.kmInicial)
      : null;
  const valorReembolsoKm =
    kmPercorridos !== null && Number.isFinite(kmPercorridos) && trip.taxaKm
      ? (kmPercorridos * Number(trip.taxaKm)).toFixed(2)
      : null;
  sectionTitle(doc, '1 · Identificação da viagem', 'PRESTAÇÃO DE CONTAS');
  balanceStrip(doc, [
    { label: 'DESPESAS LANÇADAS', value: brl(data.totalDespesas) },
    { label: 'TOTAL REEMBOLSÁVEL', value: brl(data.totalReembolsavel) },
    { label: 'COMPROVANTES', value: String(data.ocr.totalComprovantes) },
  ]);
  ledgerFields(doc, [
    { label: 'Cliente', value: trip.cliente },
    { label: 'Departamento', value: trip.departamento },
    { label: 'Destino', value: `${trip.cidade}/${trip.uf}` },
    { label: 'Período', value: `${dateBR(trip.dataSaida)} a ${dateBR(trip.dataRetorno)}` },
    {
      label: 'Centro de custo',
      value: isUuid(trip.centroDeCusto) ? 'Não informado' : (trip.centroDeCusto ?? 'Não informado'),
    },
    { label: 'Motivo', value: trip.motivo },
    {
      label: 'Veículo',
      value: trip.tipoVeiculo
        ? `${trip.tipoVeiculo}${trip.veiculo ? ` · ${trip.veiculo}` : ''}`
        : (trip.veiculo ?? 'Não informado'),
    },
    { label: 'Placa', value: trip.placa ?? 'Não informado' },
    {
      label: 'Quilometragem',
      value:
        trip.kmInicial !== null && trip.kmFinal !== null
          ? `${trip.kmInicial} km a ${trip.kmFinal} km (${kmPercorridos} km rodados)`
          : 'Não informado',
    },
    { label: 'Taxa por km', value: trip.taxaKm ? brl(trip.taxaKm) : 'Não informado' },
    {
      label: 'Reembolso por km',
      value: valorReembolsoKm ? brl(valorReembolsoKm) : 'Não informado',
    },
  ]);
  if (trip.observacoes)
    ledgerFields(doc, [{ label: 'Observações', value: trip.observacoes }], true);
}

function renderParticipantes(doc: Doc, data: ReportData): void {
  sectionTitle(doc, '2 · Participantes', 'PESSOAS E CARTÕES VINCULADOS');
  renderTable(
    doc,
    [
      { title: 'Participante', width: 310 },
      { title: 'Cartão corporativo', width: CONTENT_WIDTH - 310 },
    ],
    data.participantes.map((participant) => [
      participant.nome,
      maskCard(participant.cartaoLast4, participant.cartaoBandeira),
    ]),
  );
}

function renderDespesas(doc: Doc, data: ReportData): void {
  sectionTitle(doc, '3 · Despesas e comprovantes', 'LANÇAMENTOS E EXCEÇÕES');
  const columns: Column[] = [
    { title: 'Data', width: 58 },
    { title: 'Categoria', width: 90 },
    { title: 'Responsável', width: 76 },
    { title: 'Descrição', width: 133 },
    { title: 'Reemb.', width: 44, align: 'right' },
    { title: 'Alerta', width: 40 },
    { title: 'Valor', width: 66, align: 'right' },
  ];
  renderTable(
    doc,
    columns,
    data.despesas.map((expense) => [
      dateBR(expense.dataDespesa),
      expense.categoria,
      expense.autor,
      expense.justificativa,
      expense.reembolsavel ? 'Sim' : 'Não',
      expense.alertaExcesso ? 'Revisar' : '—',
      brl(expense.valor),
    ]),
    ['', 'TOTAL', '', '', '', '', brl(data.totalDespesas)],
  );
}

type Ficha = ReportData['ocrDetalhes'][number];
type Fields = Ficha['structured'];

const NI = 'Não identificado';
const IMG_W = 150;
const IMG_H = 416;
const FICHA_GAP = 16;
const FICHA_X = MARGIN + IMG_W + FICHA_GAP;
const FICHA_W = CONTENT_WIDTH - IMG_W - FICHA_GAP;

type Marker = { label: string; color: string };

function receiptMarker(item: Ficha): Marker {
  if (item.status === 'FALHA') {
    return item.origem === 'OCR'
      ? { label: 'LEITURA FALHOU', color: COLORS.warning }
      : { label: 'LEITURA FALHOU · DADOS MANUAIS', color: COLORS.warning };
  }
  if (item.status === 'PENDENTE') return { label: 'AGUARDANDO LEITURA', color: COLORS.faded };
  if (item.origem === 'OCR') return { label: 'EXTRAÍDO POR OCR', color: COLORS.teal };
  return { label: 'INFORMADO MANUALMENTE', color: COLORS.muted };
}

function dateValue(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateBR(parsed);
}

function drawReceiptThumb(
  doc: Doc,
  attachment: PdfAttachment | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  doc.rect(x, y, width, height).lineWidth(0.5).strokeColor(COLORS.line).stroke();
  if (!attachment) {
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text('Sem imagem', x + 4, y + height / 2 - 4, {
        width: width - 8,
        align: 'center',
        lineBreak: false,
      });
    return;
  }
  try {
    doc.image(Buffer.from(attachment.data), x + 4, y + 4, {
      fit: [width - 8, height - 8],
      align: 'center',
      valign: 'center',
    });
  } catch {
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text('Formato não suportado', x + 4, y + height / 2 - 4, {
        width: width - 8,
        align: 'center',
        lineBreak: false,
      });
  }
}

function txt(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function ni(value: string | null | undefined): string {
  return txt(value) ?? NI;
}
function mn(value: string | null | undefined): string {
  return txt(value) ? brl(txt(value) as string) : NI;
}
function dtf(value: string | null): string {
  const t = txt(value);
  if (!t) return NI;
  return dateValue(t) ?? NI;
}
function chave(value: string | null): string {
  return txt(value) ? (accessKeyDisplay(value) ?? NI) : NI;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  NFC_E: 'NFC-e',
  CFE_SAT: 'CF-e SAT',
  NFE: 'NF-e',
  RECIBO: 'Recibo',
  COMPROVANTE_PAGAMENTO: 'Comprovante de pagamento',
  OUTRO: 'Outro documento',
  NAO_IDENTIFICADO: 'Não identificado',
};

function docType(fields: Fields): string {
  const raw = txt(fields.tipoDocumento)?.toUpperCase() ?? '';
  return raw in DOC_TYPE_LABELS ? raw : 'NAO_IDENTIFICADO';
}

const docTypeLabel = (type: string): string =>
  DOC_TYPE_LABELS[type] ?? DOC_TYPE_LABELS.NAO_IDENTIFICADO ?? 'Não identificado';

interface FichaRow {
  label: string;
  value: string;
  money?: boolean;
  strong?: boolean;
  warn?: boolean;
}
interface FichaGroup {
  title: string;
  rows: FichaRow[];
}

function establishmentGroup(type: string, f: Fields): FichaGroup | null {
  const rows: FichaRow[] = [
    { label: 'Razão social', value: ni(f.nomeEstabelecimento) },
    { label: 'CNPJ', value: ni(f.cnpj) },
  ];
  if (type !== 'RECIBO' && type !== 'COMPROVANTE_PAGAMENTO') {
    rows.push(
      { label: 'Nome fantasia', value: ni(f.nomeFantasia) },
      { label: 'Inscrição estadual', value: ni(f.inscricaoEstadual) },
      { label: 'Endereço', value: ni(f.endereco) },
      { label: 'Cidade/UF', value: ni(f.cidadeUf) },
    );
  }
  if (
    (type === 'RECIBO' || type === 'COMPROVANTE_PAGAMENTO') &&
    rows.every((row) => row.value === NI)
  )
    return null;
  return { title: 'DADOS DO ESTABELECIMENTO', rows };
}

function documentGroup(type: string, f: Fields): FichaGroup {
  const rows: FichaRow[] = [];
  switch (type) {
    case 'NFC_E':
    case 'NFE':
      rows.push(
        { label: 'Tipo', value: docTypeLabel(type) },
        { label: 'Número', value: ni(f.numeroDocumento) },
        { label: 'Série', value: ni(f.serie) },
        { label: 'Data', value: dtf(f.data) },
        { label: 'Hora', value: ni(f.hora) },
        { label: 'Chave de acesso', value: chave(f.chaveAcesso) },
        { label: 'Protocolo/Autorização', value: ni(f.protocoloAutorizacao) },
      );
      break;
    case 'CFE_SAT':
      rows.push(
        { label: 'Tipo', value: docTypeLabel(type) },
        { label: 'Número do extrato', value: ni(f.numeroDocumento) },
        { label: 'Número do SAT', value: ni(f.numeroSat) },
        { label: 'Data', value: dtf(f.data) },
        { label: 'Hora', value: ni(f.hora) },
        { label: 'Chave de acesso', value: chave(f.chaveAcesso) },
      );
      break;
    case 'RECIBO':
      rows.push(
        { label: 'Tipo', value: 'Recibo' },
        { label: 'Número', value: ni(f.numeroDocumento) },
        { label: 'Data', value: dtf(f.data) },
        { label: 'Hora', value: ni(f.hora) },
      );
      break;
    case 'COMPROVANTE_PAGAMENTO':
      rows.push(
        { label: 'Tipo', value: 'Comprovante de pagamento' },
        { label: 'Data', value: dtf(f.data) },
        { label: 'Hora', value: ni(f.hora) },
        { label: 'Protocolo/Autorização', value: ni(f.protocoloAutorizacao) },
      );
      break;
    default:
      rows.push(
        { label: 'Tipo', value: docTypeLabel(type) },
        { label: 'Número', value: ni(f.numeroDocumento) },
        { label: 'Série', value: ni(f.serie) },
        { label: 'Data', value: dtf(f.data) },
        { label: 'Hora', value: ni(f.hora) },
        { label: 'Chave de acesso', value: chave(f.chaveAcesso) },
        { label: 'Protocolo/Autorização', value: ni(f.protocoloAutorizacao) },
        { label: 'Número do SAT', value: ni(f.numeroSat) },
        { label: 'QR Code', value: ni(f.qrCode) },
      );
      break;
  }
  return { title: 'DOCUMENTO FISCAL', rows };
}

function totalsGroup(type: string, f: Fields): FichaGroup {
  const rows: FichaRow[] = [];
  if (type === 'RECIBO' || type === 'COMPROVANTE_PAGAMENTO') {
    rows.push(
      { label: 'Total', value: mn(f.valorTotal), money: true, strong: true },
      { label: 'Forma de pagamento', value: ni(f.formaPagamento) },
      { label: 'Valor pago', value: mn(f.valorPago), money: true },
      { label: 'Troco', value: mn(f.troco), money: true },
    );
  } else {
    rows.push(
      { label: 'Subtotal', value: mn(f.subtotal), money: true },
      { label: 'Descontos', value: mn(f.desconto), money: true },
      { label: 'Acréscimos', value: mn(f.acrescimos), money: true },
      { label: 'Total', value: mn(f.valorTotal), money: true, strong: true },
      { label: 'Forma de pagamento', value: ni(f.formaPagamento) },
      { label: 'Valor pago', value: mn(f.valorPago), money: true },
      { label: 'Troco', value: mn(f.troco), money: true },
    );
  }
  return { title: 'TOTAIS', rows };
}

function fiscalGroup(f: Fields): FichaGroup | null {
  const rows: FichaRow[] = [
    { label: 'NCM', value: ni(f.ncm) },
    { label: 'CFOP', value: ni(f.cfop) },
    { label: 'CST/CSOSN', value: ni(f.cstCsosn) },
    { label: 'ICMS', value: ni(f.icms) },
    { label: 'PIS', value: ni(f.pis) },
    { label: 'COFINS', value: ni(f.cofins) },
  ];
  if (rows.every((row) => row.value === NI)) return null;
  return { title: 'INFORMAÇÕES FISCAIS', rows };
}

function otherGroup(f: Fields): FichaGroup | null {
  const rows: FichaRow[] = [];
  if (f.observacoes) rows.push({ label: 'Observações', value: f.observacoes });
  if (f.informacoesComplementares)
    rows.push({ label: 'Informações complementares', value: f.informacoesComplementares });
  for (const extra of f.camposExtras ?? []) {
    if (rows.length >= 8) break;
    if (!extra.label?.trim()) continue;
    rows.push({ label: `${extra.secao ?? ''}${extra.label}`.trim(), value: ni(extra.valor) });
  }
  if (rows.length === 0) return null;
  return { title: 'OUTRAS INFORMAÇÕES', rows };
}

function statusLabel(item: Ficha): string {
  if (item.status === 'SUCESSO')
    return item.origem === 'OCR' ? 'Extraído com sucesso' : 'Informado manualmente';
  if (item.status === 'FALHA')
    return item.origem === 'OCR' ? 'Falha na leitura' : 'Falha na leitura · dados manuais';
  return 'Pendente de conferência';
}

function fallbackNote(item: Ficha): string | null {
  if (item.status === 'FALHA')
    return item.origem === 'OCR'
      ? 'Não foi possível ler o comprovante automaticamente.'
      : 'Não foi possível ler o comprovante. Dados foram informados manualmente.';
  if (item.status === 'PENDENTE') return 'Dados ainda não informados para este comprovante.';
  return null;
}

function buildFicha(item: Ficha): { groups: FichaGroup[]; identified: number; total: number } {
  const f = item.structured;
  const type = docType(f);
  const groups = [
    establishmentGroup(type, f),
    documentGroup(type, f),
    totalsGroup(type, f),
    fiscalGroup(f),
    otherGroup(f),
  ].filter((group): group is FichaGroup => group !== null);

  let identified = 0;
  let total = 0;
  for (const group of groups) {
    for (const row of group.rows) {
      total += 1;
      if (row.value !== NI) identified += 1;
    }
  }

  const needsReview =
    item.status === 'FALHA' ||
    item.status === 'PENDENTE' ||
    f.confiancaExtracao === 'baixa' ||
    f.alertaReconciliacao;
  groups.push({
    title: 'CONFIABILIDADE DA EXTRAÇÃO',
    rows: [
      { label: 'Status OCR', value: statusLabel(item) },
      {
        label: 'Confiança da extração',
        value:
          f.confiancaExtracao === 'alta'
            ? 'Alta'
            : f.confiancaExtracao === 'media'
              ? 'Média'
              : f.confiancaExtracao === 'baixa'
                ? 'Baixa'
                : NI,
      },
      { label: 'Campos identificados', value: `${identified} de ${total}` },
      { label: 'Necessita revisão manual', value: needsReview ? 'Sim' : 'Não', warn: needsReview },
    ],
  });
  return { groups, identified, total };
}

const FICHA_LABEL_WIDTH = 84;

// A ficha row's height must fit whichever of label/value wraps to more lines.
// Long labels ("INSCRIÇÃO ESTADUAL", "PROTOCOLO/AUTORIZAÇÃO", "NECESSITA
// REVISÃO MANUAL"...) routinely wrap to two lines in the narrow label column;
// sizing the row from the value alone let the next row start underneath the
// still-wrapping label, producing overlapping text.
function fichaRowHeight(doc: Doc, row: FichaRow, valueWidth: number): number {
  doc.font(FONT.regular).fontSize(6.4);
  const labelHeight = doc.heightOfString(row.label.toUpperCase(), {
    width: FICHA_LABEL_WIDTH - 4,
    characterSpacing: 0.9,
  });
  doc.font(FONT.regular).fontSize(7.6);
  const valueHeight = doc.heightOfString(row.value, { width: valueWidth, lineGap: 0.6 });
  return Math.max(11, Math.max(labelHeight, valueHeight) + 3);
}

function fichaGroupHeight(doc: Doc, group: FichaGroup, width: number): number {
  const valueWidth = width - FICHA_LABEL_WIDTH - 16;
  let inner = 0;
  for (const row of group.rows) {
    inner += fichaRowHeight(doc, row, valueWidth);
  }
  return 18 + inner + 5;
}

function renderFichaGroupAt(
  doc: Doc,
  group: FichaGroup,
  x: number,
  y: number,
  width: number,
): number {
  const height = fichaGroupHeight(doc, group, width);
  doc.rect(x, y, width, height).lineWidth(0.6).strokeColor(COLORS.line).stroke();
  doc
    .font(FONT.bold)
    .fontSize(6.6)
    .fillColor(COLORS.teal)
    .text(group.title, x + 7, y + 4, {
      width: width - 14,
      characterSpacing: 0.7,
      lineBreak: false,
    });
  doc
    .moveTo(x, y + 15)
    .lineTo(x + width, y + 15)
    .lineWidth(0.5)
    .strokeColor(COLORS.teal)
    .stroke();
  const valueWidth = width - FICHA_LABEL_WIDTH - 14;
  let cursor = y + 18;
  for (const row of group.rows) {
    const rowHeight = fichaRowHeight(doc, row, valueWidth);
    smallCapsLabel(
      doc,
      row.label.toUpperCase(),
      x + 7,
      cursor + 1.5,
      FICHA_LABEL_WIDTH - 4,
      row.money ? COLORS.muted : COLORS.faded,
    );
    doc
      .font(row.strong ? FONT.bold : FONT.regular)
      .fontSize(7.6)
      .fillColor(row.value === NI ? COLORS.faded : row.warn ? COLORS.warning : COLORS.ink)
      .text(row.value, x + 7 + FICHA_LABEL_WIDTH, cursor, {
        width: valueWidth,
        align: row.money ? 'right' : 'left',
        lineGap: 0.6,
      });
    cursor += rowHeight;
  }
  return y + height + 6;
}

function stackFichaGroup(doc: Doc, group: FichaGroup, x: number, width: number): boolean {
  const height = fichaGroupHeight(doc, group, width);
  const brokePage = doc.y + height + 8 > CONTENT_BOTTOM;
  if (brokePage) newPage(doc);
  doc.y = renderFichaGroupAt(doc, group, x, doc.y, width);
  return brokePage;
}

function renderFichaItems(doc: Doc, f: Fields, type: string): void {
  const showItems = f.itens.length > 0 || type === 'NFC_E' || type === 'CFE_SAT' || type === 'NFE';
  if (!showItems) return;
  ensureSpace(doc, 26);
  const y = doc.y;
  doc.font(FONT.bold).fontSize(6.6).fillColor(COLORS.teal).text('ITENS DO DOCUMENTO', MARGIN, y, {
    width: CONTENT_WIDTH,
    characterSpacing: 0.7,
    lineBreak: false,
  });
  doc.y = y + 11;
  if (f.itens.length === 0) {
    doc
      .font(FONT.regular)
      .fontSize(7.6)
      .fillColor(COLORS.faded)
      .text('Nenhum item identificado no documento.', MARGIN, doc.y, { width: CONTENT_WIDTH });
    doc.y += 14;
    return;
  }
  renderTable(
    doc,
    [
      { title: 'Descrição', width: 208 },
      { title: 'Qtd', width: 40, align: 'right' },
      { title: 'Un.', width: 42 },
      { title: 'Valor unitário', width: 76, align: 'right' },
      { title: 'Desconto', width: 68, align: 'right' },
      { title: 'Valor total', width: 73, align: 'right' },
    ],
    f.itens.map((item) => [
      item.descricao,
      item.quantidade === null || item.quantidade === undefined ? '—' : String(item.quantidade),
      ni(item.unidade),
      item.valorUnitario === null || item.valorUnitario === undefined
        ? '—'
        : brl(item.valorUnitario.toFixed(2)),
      item.desconto === null || item.desconto === undefined ? '—' : brl(item.desconto.toFixed(2)),
      item.valorTotal === null || item.valorTotal === undefined
        ? '—'
        : brl(item.valorTotal.toFixed(2)),
    ]),
  );
}

function renderReceiptFicha(
  doc: Doc,
  item: Ficha,
  attachment: PdfAttachment | undefined,
  index: number,
): void {
  // Reserve space for the header together with the thumbnail that always follows it
  // (not just the header's own 40pt): otherwise the header could fit at the bottom
  // of a page while the thumbnail+first fields broke to the next one, leaving an
  // orphaned "Comprovante N" heading followed by an almost-blank page.
  ensureSpace(doc, 40 + IMG_H + 16);
  const yHeader = doc.y;
  doc
    .font(FONT.bold)
    .fontSize(9)
    .fillColor(COLORS.ink)
    .text(`Comprovante ${index + 1} · ${item.categoria}`, MARGIN, yHeader, {
      width: 250,
      lineBreak: false,
    });
  const marker = receiptMarker(item);
  smallCapsLabel(
    doc,
    marker.label,
    PAGE_WIDTH - MARGIN - 190,
    yHeader + 2,
    190,
    marker.color,
    'right',
  );
  doc
    .font(FONT.regular)
    .fontSize(7)
    .fillColor(COLORS.faded)
    .text(item.fileName, PAGE_WIDTH - MARGIN - 190, yHeader + 12, {
      width: 190,
      align: 'right',
      lineBreak: false,
      ellipsis: true,
    });
  if (item.conferidoEm) {
    smallCapsLabel(
      doc,
      `CONFERIDO EM ${dateBR(item.conferidoEm)}`,
      PAGE_WIDTH - MARGIN - 190,
      yHeader + 23,
      190,
      COLORS.faded,
      'right',
    );
  }
  doc
    .moveTo(MARGIN, yHeader + 34)
    .lineTo(PAGE_WIDTH - MARGIN, yHeader + 34)
    .lineWidth(0.4)
    .strokeColor(COLORS.line)
    .stroke();

  const { groups, identified } = buildFicha(item);
  const sticky = groups.slice(0, 3);
  const footer = groups.slice(3);

  ensureSpace(doc, IMG_H + 16);
  const yBody = doc.y;
  drawReceiptThumb(doc, attachment, MARGIN, yBody, IMG_W, IMG_H);
  let brokePage = false;
  for (const group of sticky) {
    if (stackFichaGroup(doc, group, FICHA_X, FICHA_W)) brokePage = true;
  }
  doc.y = brokePage ? doc.y + 4 : Math.max(doc.y, yBody + IMG_H) + 4;

  const note = identified === 0 ? fallbackNote(item) : null;
  if (note) {
    ensureSpace(doc, 22);
    doc
      .font(FONT.regular)
      .fontSize(7.8)
      .fillColor(COLORS.muted)
      .text(note, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 0.8 });
    doc.y += 14;
  }

  renderFichaItems(doc, item.structured, docType(item.structured));

  for (const group of footer) {
    const height = fichaGroupHeight(doc, group, CONTENT_WIDTH);
    ensureSpace(doc, height + 10);
    doc.y = renderFichaGroupAt(doc, group, MARGIN, doc.y, CONTENT_WIDTH);
  }

  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(PAGE_WIDTH - MARGIN, doc.y)
    .lineWidth(0.4)
    .strokeColor(COLORS.line)
    .stroke();
  doc.y += 14;
}

function renderReceiptBlocks(doc: Doc, data: ReportData, attachments: PdfAttachment[]): void {
  if (data.ocrDetalhes.length === 0) return;
  sectionTitle(doc, 'Comprovantes', 'FICHA FISCAL E DOCUMENTAL · CONFERÊNCIA', 190);
  data.ocrDetalhes.forEach((item, index) => {
    const attachment = attachments.find((candidate) =>
      item.fileHash ? candidate.fileHash === item.fileHash : candidate.receiptId === item.receiptId,
    );
    renderReceiptFicha(doc, item, attachment, index);
  });
}

function renderCoverage(doc: Doc, data: ReportData): void {
  const ocr = data.ocr;
  sectionTitle(doc, '4 · Conferência de comprovantes', 'COBERTURA E RASTREABILIDADE');
  const line = `Total ${ocr.totalComprovantes} · OCR ${ocr.comOcr} · Manual ${ocr.manual} · Pendente ${ocr.pendentes} · Falha ${ocr.falhas} · Valor extraído ${brl(ocr.valorExtraidoTotal)}`;
  doc
    .font(FONT.regular)
    .fontSize(8.2)
    .fillColor(COLORS.ink)
    .text(line, MARGIN, doc.y, { width: CONTENT_WIDTH, lineGap: 1 });
  doc.y += 14;
}

function renderFinanceiro(doc: Doc, data: ReportData): void {
  const financeiro = data.financeiro;
  const rows = [
    ...financeiro.adiantamentos.map((record) => [
      'Adiantamento',
      dateBR(record.data),
      record.responsavel,
      '-',
      brl(record.valor),
    ]),
    ...financeiro.reembolsos.map((record) => [
      'Reembolso',
      dateBR(record.data),
      record.responsavel,
      record.comprovanteNome ?? '—',
      brl(record.valor),
    ]),
    ...financeiro.devolucoes.map((record) => [
      'Devolução',
      dateBR(record.data),
      record.responsavel,
      record.comprovanteNome ?? '—',
      brl(record.valor),
    ]),
  ];
  sectionTitle(doc, '5 · Movimentações financeiras', 'ADIANTAMENTOS, PAGAMENTOS E DEVOLUÇÕES');
  if (rows.length === 0) {
    ledgerFields(
      doc,
      [{ label: 'Situação financeira', value: 'Nenhuma movimentação financeira registrada.' }],
      true,
    );
    return;
  }
  const columns: Column[] = [
    { title: 'Tipo', width: 103 },
    { title: 'Data', width: 62 },
    { title: 'Responsável', width: 112 },
    { title: 'Comprovante', width: 140 },
    { title: 'Valor', width: CONTENT_WIDTH - 417, align: 'right' },
  ];
  renderTable(doc, columns, rows);
  ledgerFields(doc, [
    { label: 'Total de reembolsos', value: brl(financeiro.totalReembolsos) },
    { label: 'Total de adiantamentos', value: brl(financeiro.totalAdiantamentos) },
    { label: 'Total de devoluções', value: brl(financeiro.totalDevolucoes) },
  ]);
}

function renderAprovacao(doc: Doc): void {
  sectionTitle(doc, '6 · Aprovação', 'REGISTRO DE CONFERÊNCIA', 86);
  const labelWidth = 120;
  const y = doc.y;
  smallCapsLabel(doc, 'APROVADO POR', MARGIN, y + 2, labelWidth);
  doc
    .font(FONT.regular)
    .fontSize(8.6)
    .fillColor(COLORS.ink)
    .text('Gestor responsável', MARGIN + labelWidth, y, {
      width: CONTENT_WIDTH - labelWidth,
      lineBreak: false,
    });
  doc
    .moveTo(MARGIN, y + 20)
    .lineTo(MARGIN + 220, y + 20)
    .lineWidth(0.6)
    .strokeColor(COLORS.ink)
    .stroke();
  smallCapsLabel(doc, 'ASSINATURA', MARGIN + 14, y + 24, 120);
  smallCapsLabel(doc, 'OBSERVAÇÕES', MARGIN, y + 42, labelWidth);
  doc
    .moveTo(MARGIN, y + 62)
    .lineTo(PAGE_WIDTH - MARGIN, y + 62)
    .lineWidth(0.5)
    .strokeColor(COLORS.line)
    .stroke();
  smallCapsLabel(doc, 'DATA', MARGIN + 240, y + 24, 60);
  doc
    .moveTo(MARGIN + 240, y + 38)
    .lineTo(MARGIN + 300, y + 38)
    .lineWidth(0.6)
    .strokeColor(COLORS.ink)
    .stroke();
  doc.y = y + 70;
  smallCapsLabel(
    doc,
    'DOCUMENTO GERADO ELETRONICAMENTE PELA VAIEFECHA',
    MARGIN,
    doc.y,
    CONTENT_WIDTH,
    COLORS.faded,
  );
  doc.y += 12;
}

function attachComprovantes(doc: Doc, attachments: PdfAttachment[], startIndex: number): void {
  for (const [index, attachment] of attachments.entries()) {
    newPage(doc);
    doc.font(FONT.bold).fontSize(9).fillColor(COLORS.ink).text('Comprovante anexado');
    doc
      .font(FONT.regular)
      .fontSize(7)
      .fillColor(COLORS.faded)
      .text(
        `Anexo ${startIndex + index + 1} de ${startIndex + attachments.length} · ${attachment.fileName}`,
        MARGIN,
        doc.y + 2,
        { characterSpacing: 0.6, lineBreak: false },
      );
    doc
      .moveTo(MARGIN, doc.y + 12)
      .lineTo(PAGE_WIDTH - MARGIN, doc.y + 12)
      .lineWidth(0.4)
      .strokeColor(COLORS.teal)
      .stroke();
    doc.y += 18;
    try {
      doc.image(Buffer.from(attachment.data), MARGIN, doc.y, {
        fit: [CONTENT_WIDTH, 620],
        align: 'center',
      });
    } catch {
      doc.rect(MARGIN, doc.y, CONTENT_WIDTH, 90).lineWidth(0.5).strokeColor(COLORS.line).stroke();
      doc
        .font(FONT.regular)
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text('Comprovante em formato não suportado para exibição.', MARGIN + 12, doc.y + 39, {
          width: CONTENT_WIDTH - 24,
          align: 'center',
        });
    }
  }
}

function reportContext(data: ReportData, title: string, subtitle: string): PageContext {
  return {
    title,
    subtitle,
    emittedAt: data.emitidoEm,
    emittedBy: data.emitidoPor,
    version: data.versao,
    status: data.trip.status,
  };
}

function orderAttachments(data: ReportData, attachments: PdfAttachment[]): PdfAttachment[] {
  const byReceiptId = new Map(attachments.map((attachment) => [attachment.receiptId, attachment]));
  const ordered: PdfAttachment[] = [];
  const used = new Set<string>();
  for (const item of data.ocrDetalhes) {
    const attachment = byReceiptId.get(item.receiptId);
    if (attachment) {
      ordered.push(attachment);
      used.add(attachment.receiptId);
    }
  }
  for (const attachment of attachments) {
    if (!used.has(attachment.receiptId)) {
      ordered.push(attachment);
      used.add(attachment.receiptId);
    }
  }
  return ordered;
}

export async function renderOfficialPdf(
  data: ReportData,
  options: { attachments: PdfAttachment[] },
): Promise<Buffer> {
  return render(
    (doc) => {
      doc.y = CONTENT_TOP;
      tripInfo(doc, data);
      renderParticipantes(doc, data);
      renderDespesas(doc, data);
      const ordered = orderAttachments(data, options.attachments);
      renderReceiptBlocks(doc, data, ordered);
      renderCoverage(doc, data);
      renderFinanceiro(doc, data);
      renderAprovacao(doc);
      if (ordered.length > 0) attachComprovantes(doc, ordered, 0);
    },
    reportContext(
      data,
      'RELATÓRIO OFICIAL DE VIAGEM',
      'Prestação de contas e conferência documental',
    ),
  );
}

export async function renderManagerPdf(
  data: ReportData,
  options: { attachments: PdfAttachment[] },
): Promise<Buffer> {
  return render(
    (doc) => {
      doc.y = CONTENT_TOP;
      tripInfo(doc, data);
      renderParticipantes(doc, data);
      renderDespesas(doc, data);
      renderCoverage(doc, data);
      renderFinanceiro(doc, data);
      renderAprovacao(doc);
      if (options.attachments.length > 0) attachComprovantes(doc, options.attachments, 0);
    },
    reportContext(
      data,
      'RESUMO GERENCIAL DE VIAGEM',
      'Custos, participantes e documentos vinculados',
    ),
  );
}

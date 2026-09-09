import PDFDocument from 'pdfkit';
import type { PdfAttachment, ReportData } from './report.types.js';

type Doc = InstanceType<typeof PDFDocument>;

const MARGIN = 48;
const COLORS = {
  primary: '#1f4e79',
  secondary: '#333333',
  emphasis: '#7f1d1d',
  line: '#bbbbbb',
  headerBg: '#e8eef4',
};

function brl(value: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
}

function dateBR(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function render(content: (doc: Doc) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, pdfVersion: '1.7' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    content(doc);
    doc.end();
  });
}

function sectionTitle(doc: Doc, text: string): void {
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(COLORS.primary).text(text.toUpperCase());
  doc
    .moveTo(MARGIN, doc.y)
    .lineTo(595.28 - MARGIN, doc.y)
    .lineWidth(1)
    .strokeColor(COLORS.line)
    .stroke();
  doc.moveDown(0.4);
}

function kvPair(doc: Doc, label: string, value: string): void {
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor(COLORS.primary)
    .text(label, MARGIN, doc.y, { width: 150, continued: true });
  doc
    .font('Helvetica')
    .fillColor(COLORS.secondary)
    .text(value, { width: 595.28 - MARGIN * 2 - 150 });
}

interface Column {
  title: string;
  width: number;
  align?: 'left' | 'right';
}

function tableStart(doc: Doc, columns: Column[]): number {
  const tableX = MARGIN;
  const y = doc.y;
  doc.font('Helvetica-Bold').fontSize(8.5);
  doc.fillColor('#ffffff');
  const totalHeaderWidth = columns.reduce((sum, c) => sum + c.width, 0);
  let x = tableX;
  doc.rect(MARGIN, y, totalHeaderWidth, 16).fill(COLORS.primary);
  doc.fillColor('#ffffff');
  for (const column of columns) {
    doc.text(column.title, x + 4, y + 4.5, { width: column.width - 8 });
    x += column.width;
  }
  doc.fillColor(COLORS.secondary);
  doc.moveDown(0.2);
  return y + 16 + 4;
}

function tableRow(
  doc: Doc,
  columns: Column[],
  cells: string[],
  yStart?: number,
  options?: { emphasized?: boolean },
): number {
  const tableX = MARGIN;
  const y = yStart ?? doc.y;
  doc.font(options?.emphasized ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5);
  doc.fillColor(options?.emphasized ? '#ffffff' : COLORS.secondary);
  const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
  if (options?.emphasized) {
    doc.rect(tableX, y - 4.5, totalWidth, 16).fill('#f59e0b');
    doc.fillColor('#ffffff');
  }
  let x = tableX;
  for (let i = 0; i < columns.length; i += 1) {
    const column = columns[i];
    if (!column) continue;
    const cell = cells[i] ?? '';
    doc.text(cell, x + 4, y, {
      width: column.width - 8,
      align: column.align ?? 'left',
      lineGap: 1,
    });
    x += column.width;
  }
  doc.fillColor(COLORS.secondary);
  const height = 20;
  doc
    .moveTo(tableX, y + height - 8)
    .lineTo(tableX + totalWidth, y + height - 8)
    .lineWidth(0.5)
    .strokeColor(COLORS.line)
    .stroke();
  return y + height;
}

function renderHeader(doc: Doc, title: string, subtitle: string): void {
  doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.primary).text(title.toUpperCase());
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.secondary).text(subtitle);
  doc
    .moveTo(MARGIN, doc.y + 4)
    .lineTo(595.28 - MARGIN, doc.y + 4)
    .lineWidth(1.5)
    .strokeColor(COLORS.primary)
    .stroke();
  doc.moveDown(0.6);
}

function tripInfo(doc: Doc, data: ReportData): void {
  const trip = data.trip;
  kvPair(doc, 'Cliente', trip.cliente);
  kvPair(doc, 'Destino', `${trip.cidade}/${trip.uf}`);
  kvPair(doc, 'Período', `${dateBR(trip.dataSaida)} a ${dateBR(trip.dataRetorno)}`);
  kvPair(doc, 'Departamento', trip.departamento);
  kvPair(doc, 'Status', trip.status.replace('_', ' '));
  kvPair(doc, 'Motivo', trip.motivo);
  kvPair(
    doc,
    'Veículo',
    trip.tipoVeiculo
      ? `${trip.tipoVeiculo}${trip.veiculo ? ` - ${trip.veiculo}` : ''}`
      : (trip.veiculo ?? '-'),
  );
  kvPair(doc, 'Placa', trip.placa ?? '-');
  kvPair(doc, 'Km', trip.kmInicial && trip.kmFinal ? `${trip.kmInicial} - ${trip.kmFinal}` : '-');
  kvPair(doc, 'Taxa por Km', trip.taxaKm ? brl(trip.taxaKm) : '-');
  kvPair(doc, 'Centro de custo', trip.centroDeCusto ?? '-');
  if (trip.observacoes) kvPair(doc, 'Observações', trip.observacoes);
}

function renderParticipantes(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Participantes');
  const columns: Column[] = [{ title: 'Nome', width: 499 }];
  let y = tableStart(doc, columns);
  for (const participant of data.participantes) {
    if (y > 720) {
      doc.addPage();
      y = MARGIN;
    }
    y = tableRow(doc, columns, [participant.nome], y);
    y += 2;
  }
  doc.y = y;
}

function renderDespesas(doc: Doc, data: ReportData): void {
  sectionTitle(doc, 'Despesas');
  const columns: Column[] = [
    { title: 'Data', width: 55 },
    { title: 'Categoria', width: 110 },
    { title: 'Autor', width: 85 },
    { title: 'Descrição', width: 130 },
    { title: 'Reemb.', width: 40, align: 'right' },
    { title: 'Alerta', width: 16 },
    { title: 'Valor', width: 63, align: 'right' },
  ];
  let y = tableStart(doc, columns);
  for (const expense of data.despesas) {
    if (y > 700) {
      doc.addPage();
      y = MARGIN;
    }
    const descricao =
      expense.justificativa.length > 80
        ? `${expense.justificativa.slice(0, 77)}...`
        : expense.justificativa;
    y = tableRow(
      doc,
      columns,
      [
        dateBR(expense.dataDespesa),
        expense.categoria,
        expense.autor,
        descricao,
        expense.reembolsavel ? 'sim' : 'não',
        expense.alertaExcesso ? '!' : '',
        brl(expense.valor),
      ],
      y,
    );
    y += 2;
  }
  y = tableRow(doc, columns, ['', 'TOTAL', '', '', '', '', brl(data.totalDespesas)], y, {
    emphasized: true,
  });
  doc.y = y + 8;
  kvPair(doc, 'Total geral', brl(data.totalDespesas));
  kvPair(doc, 'Total reembolsável', brl(data.totalReembolsavel));
  doc.moveDown(0.6);
}

function renderFinanceiro(doc: Doc, data: ReportData): void {
  const financeiro = data.financeiro;
  const hasFinance =
    financeiro.adiantamentos.length + financeiro.reembolsos.length + financeiro.devolucoes.length >
    0;
  if (!hasFinance) {
    sectionTitle(doc, 'Reembolso');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text('Nenhuma movimentação financeira registrada.');
    return;
  }
  const columns: Column[] = [
    { title: 'Tipo', width: 105 },
    { title: 'Data', width: 70 },
    { title: 'Responsável', width: 110 },
    { title: 'Comprovante', width: 130 },
    { title: 'Valor', width: 84, align: 'right' },
  ];
  sectionTitle(doc, 'Movimentações financeiras');
  let y = tableStart(doc, columns);
  const rows: Array<{
    tipo: string;
    data: Date;
    responsavel: string;
    comprovante: string | null;
    valor: string;
  }> = [
    ...financeiro.adiantamentos.map((r) => ({
      tipo: 'Adiantamento',
      data: r.data,
      responsavel: r.responsavel,
      comprovante: null,
      valor: r.valor,
    })),
    ...financeiro.reembolsos.map((r) => ({
      tipo: 'Reembolso',
      data: r.data,
      responsavel: r.responsavel,
      comprovante: r.comprovanteNome,
      valor: r.valor,
    })),
    ...financeiro.devolucoes.map((r) => ({
      tipo: 'Devolução',
      data: r.data,
      responsavel: r.responsavel,
      comprovante: r.comprovanteNome,
      valor: r.valor,
    })),
  ];
  for (const row of rows) {
    if (y > 700) {
      doc.addPage();
      y = MARGIN;
    }
    y = tableRow(
      doc,
      columns,
      [row.tipo, dateBR(row.data), row.responsavel, row.comprovante ?? '-', brl(row.valor)],
      y,
    );
    y += 2;
  }
  y = tableRow(doc, columns, ['TOTAL PAGAMENTOS', '', '', '', brl(financeiro.totalReembolsos)], y, {
    emphasized: true,
  });
  y = tableRow(
    doc,
    columns,
    ['TOTAL ADIANTAMENTOS', '', '', '', brl(financeiro.totalAdiantamentos)],
    y,
  );
  y = tableRow(doc, columns, ['TOTAL DEVOLUÇÕES', '', '', '', brl(financeiro.totalDevolucoes)], y);
  doc.y = y + 8;
}

function renderFooter(doc: Doc, data: ReportData): void {
  doc.moveDown(1);
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#888888')
    .text(
      `Emitido em ${dateBR(data.emitidoEm)} às ${data.emitidoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} por ${data.emitidoPor} - Documento gerado eletronicamente.`,
    );
}

function attachComprovantes(doc: Doc, attachments: PdfAttachment[]): void {
  for (const attachment of attachments.slice(0, 10)) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.primary).text(attachment.fileName);
    doc.moveDown(0.5);
    try {
      doc.image(Buffer.from(attachment.data), {
        fit: [500, 680],
        align: 'center',
        valign: 'center',
      });
    } catch {
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.secondary)
        .text('Comprovante em formato não suportado para exibição.');
    }
  }
}

export async function renderOfficialPdf(
  data: ReportData,
  options: { attachments: PdfAttachment[] },
): Promise<Buffer> {
  return render((doc) => {
    renderHeader(doc, 'Relatório de Viagem', `Relatório oficial - Viagem ${data.trip.id}`);
    sectionTitle(doc, 'Informações da viagem');
    tripInfo(doc, data);
    renderParticipantes(doc, data);
    renderDespesas(doc, data);
    renderFinanceiro(doc, data);
    renderFooter(doc, data);
    if (options.attachments.length > 0) {
      sectionTitle(doc, 'Comprovantes anexados');
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(COLORS.secondary)
        .text(`${options.attachments.length} comprovante(s) anexado(s) nas páginas seguintes.`);
    }
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.primary).text('ANEXO - COMPROVANTES');
    doc.moveDown(0.6);
    attachComprovantes(doc, options.attachments);
  });
}

export async function renderManagerPdf(
  data: ReportData,
  options: { attachments: PdfAttachment[] },
): Promise<Buffer> {
  return render((doc) => {
    renderHeader(doc, 'Resumo Gerencial de Viagem', `Visão gerencial - Viagem ${data.trip.id}`);
    tripInfo(doc, data);
    sectionTitle(doc, 'Participantes');
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLORS.secondary)
      .text(data.participantes.map((p) => p.nome).join(', '));
    renderDespesas(doc, data);
    if (options.attachments.length > 0) {
      doc.addPage();
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(COLORS.primary)
        .text('ANEXO - COMPROVANTES');
      doc.moveDown(0.6);
      attachComprovantes(doc, options.attachments);
    }
  });
}

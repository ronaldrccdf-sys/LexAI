import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { db, runMigrations, seedIfEmpty } from './db.js';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const datajudApiKey = process.env.DATAJUD_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

app.use(helmet());
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

runMigrations();
seedIfEmpty();

const getAI = () => {
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY não configurada.');
  }
  return new GoogleGenAI({ apiKey: geminiApiKey });
};

const resolveTribunalEndpoint = (cnj: string): string => {
  const parts = cnj.split('.');
  if (parts.length < 5) return 'tjsp';

  const j = parts[2];
  const tr = parts[3];

  if (j === '8') {
    const tjMap: Record<string, string> = {
      '01': 'tjac', '02': 'tjal', '03': 'tjap', '04': 'tjam', '05': 'tjba',
      '06': 'tjce', '07': 'tjdf', '08': 'tjes', '09': 'tjgo', '10': 'tjma',
      '11': 'tjmt', '12': 'tjms', '13': 'tjmg', '14': 'tjpa', '15': 'tjpb',
      '16': 'tjpr', '17': 'tjpe', '18': 'tjpi', '19': 'tjrj', '20': 'tjrn',
      '21': 'tjrs', '22': 'tjro', '23': 'tjrr', '24': 'tjsc', '25': 'tjse',
      '26': 'tjsp', '27': 'tjt0'
    };
    return `tj${tjMap[tr] || 'sp'}`;
  }

  if (j === '4') return `trt${parseInt(tr, 10)}`;
  if (j === '3') return `trf${parseInt(tr, 10)}`;
  if (j === '1') return 'stf';
  if (j === '9') return 'stj';

  return 'tjsp';
};

const mapContact = (row: any) => ({
  id: row.id,
  name: row.name,
  document: row.document,
  email: row.email,
  phone: row.phone,
  type: row.type,
  totalMatters: row.total_matters,
  folderId: row.folder_id,
  category: row.category,
  financialStatus: row.financial_status
});

const mapContract = (row: any) => ({
  id: row.id,
  clientId: row.client_id,
  type: row.type,
  monthlyValue: row.monthly_value,
  successPercentage: row.success_percentage,
  validity: row.validity,
  status: row.status,
  adjustments: row.adjustments,
  specialConditions: row.special_conditions
});

const getCaseUpdates = (matterId: string) => {
  return db.prepare('SELECT * FROM case_updates WHERE matter_id = ? ORDER BY date DESC').all(matterId).map((update: any) => ({
    id: update.id,
    date: update.date,
    content: update.content,
    source: update.source,
    type: update.type
  }));
};

const mapMatter = (row: any) => ({
  id: row.id,
  number: row.number,
  title: row.title,
  client: row.client,
  opposingParty: row.opposing_party,
  status: row.status,
  type: row.type,
  responsible: row.responsible,
  openDate: row.open_date,
  billableHours: row.billable_hours,
  lastMovementSummary: row.last_movement_summary,
  updates: getCaseUpdates(row.id)
});

const mapHearing = (row: any) => ({
  id: row.id,
  matterId: row.matter_id,
  matterNumber: row.matter_number,
  clientId: row.client_id,
  clientName: row.client_name,
  type: row.type,
  date: row.date,
  time: row.time,
  court: row.court,
  modality: row.modality,
  responsible: row.responsible,
  settlementProbability: row.settlement_probability,
  valueInvolved: row.value_involved,
  result: row.result,
  notes: row.notes
});

const mapAgenda = (row: any) => ({
  id: row.id,
  type: row.type,
  date: row.date,
  timeStart: row.time_start,
  timeEnd: row.time_end,
  sourceId: row.source_id,
  matterId: row.matter_id,
  clientName: row.client_name,
  responsible: row.responsible,
  title: row.title
});

const mapActivity = (row: any) => ({
  id: row.id,
  matter: row.matter,
  description: row.description,
  duration: row.duration,
  createdAt: row.created_at
});

const mapBillingCycle = (row: any) => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name,
  period: row.period,
  type: row.type,
  baseValue: row.base_value,
  successFeeValue: row.success_fee_value,
  totalValue: row.total_value,
  status: row.status,
  requirements: JSON.parse(row.requirements),
  dueDate: row.due_date
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/datajud/process', async (req, res) => {
  const schema = z.object({ cnj: z.string().min(5) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  if (!datajudApiKey) {
    return res.status(500).json({ error: 'DATAJUD_API_KEY não configurada.' });
  }

  const cleanCNJ = parsed.data.cnj.replace(/[^\d.-]/g, '');
  const tribunalSlug = resolveTribunalEndpoint(cleanCNJ);
  const endpoint = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunalSlug}/_search`;
  const body = {
    query: {
      match: {
        numeroProcesso: cleanCNJ.replace(/\D/g, '')
      }
    }
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `APIKey ${datajudApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `DATAJUD status ${response.status}` });
    }

    const result = await response.json();
    const hits = result.hits?.hits;
    if (!hits || hits.length === 0) {
      return res.json({ data: null });
    }

    const source = hits[0]._source;
    const mapped = {
      id: source.id || cleanCNJ,
      numero_cnj: source.numeroProcesso,
      classe: source.classe?.nome || 'Classe não informada',
      tribunal: source.tribunal || tribunalSlug.toUpperCase(),
      orgao_julgador: source.orgaoJulgador?.nome || 'Vara Indefinida',
      data_ajuizamento: source.dataAjuizamento,
      movimentacoes: (source.movimentacoes || []).map((m: any, i: number) => ({
        id: i,
        data: m.dataHora,
        conteudo: m.movimento?.nome || 'Movimentação sem descrição',
        nome: m.movimento?.nome
      })),
      partes: []
    };
    res.json({ data: mapped });
  } catch (error) {
    console.error(error);
    res.status(502).json({ error: 'Falha ao consultar DATAJUD.' });
  }
});

app.post('/api/ai/daily-briefing', async (req, res) => {
  const schema = z.object({ stats: z.any(), userName: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um briefing diário estratégico LexAI para o advogado ${parsed.data.userName} baseado nestes dados: ${JSON.stringify(parsed.data.stats)}. 
      REGRAS OBRIGATÓRIAS:
      1. NÃO utilize caracteres especiais como asteriscos (*), hashtags (#), sublinhados (_) ou qualquer formatação markdown.
      2. Mantenha a organização por tópicos claros.
      3. Utilize apenas hifens (-) e quebras de linha para separar os pontos.
      4. O tom deve ser executivo, direto e motivador.`
    });
    res.json({ data: response.text?.replace(/[*#_~`>]/g, '') || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar briefing.' });
  }
});

app.post('/api/ai/interpret-movement', async (req, res) => {
  const schema = z.object({ movement: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Interprete este movimento processual: ${parsed.data.movement}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao interpretar movimentação.' });
  }
});

app.post('/api/ai/smart-time-entry', async (req, res) => {
  const schema = z.object({ description: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Formalize este timesheet: ${parsed.data.description}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao formatar timesheet.' });
  }
});

app.post('/api/ai/management-analysis', async (req, res) => {
  const schema = z.object({ firmData: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Elabore um diagnóstico de gestão para este escritório: ${JSON.stringify(parsed.data.firmData)}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar análise.' });
  }
});

app.post('/api/ai/answer-management-query', async (req, res) => {
  const schema = z.object({ query: z.string(), firmData: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Responda a consulta: ${parsed.data.query}. Dados: ${JSON.stringify(parsed.data.firmData)}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao responder consulta.' });
  }
});

app.post('/api/ai/billing-report', async (req, res) => {
  const schema = z.object({ clientName: z.string(), period: z.string(), events: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um relatório de atividades para ${parsed.data.clientName} referente a ${parsed.data.period}: ${JSON.stringify(parsed.data.events)}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar relatório.' });
  }
});

app.post('/api/ai/whatsapp-summary', async (req, res) => {
  const schema = z.object({ events: z.any() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Crie um resumo para WhatsApp destes eventos: ${JSON.stringify(parsed.data.events)}`
    });
    res.json({ data: response.text || '' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar resumo.' });
  }
});

app.post('/api/ai/search-jurisprudence', async (req, res) => {
  const schema = z.object({ query: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Pesquise jurisprudência recente nos tribunais brasileiros via Radar LexAI: ${parsed.data.query}.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const items = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web)
      .map((chunk: any, i: number) => ({
        id: `j-${i}`,
        title: chunk.web.title,
        summary: '',
        uri: chunk.web.uri
      }));
    res.json({ data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao buscar jurisprudência.' });
  }
});

app.post('/api/ai/search-doctrines', async (req, res) => {
  const schema = z.object({ query: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Aja como um pesquisador acadêmico jurídico. Busque no Google Acadêmico (scholar.google.com), Scielo e repositórios acadêmicos teses e artigos científicos sobre: ${parsed.data.query}. FOCO: Retorne os nomes exatos dos artigos e autores.`,
      config: { tools: [{ googleSearch: {} }] }
    });
    const items = (response.candidates?.[0]?.groundingMetadata?.groundingChunks || [])
      .filter((chunk: any) => chunk.web)
      .map((chunk: any, i: number) => ({
        id: `doc-${i}`,
        title: chunk.web.title || 'Artigo Acadêmico Indefinido',
        summary: '',
        uri: chunk.web.uri
      }));
    res.json({ data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao buscar doutrinas.' });
  }
});

app.post('/api/ai/advanced-drafting', async (req, res) => {
  const schema = z.object({
    prompt: z.string(),
    files: z.array(z.object({
      id: z.string(),
      name: z.string(),
      data: z.string(),
      type: z.string(),
      role: z.string()
    })),
    jurisprudence: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string(), uri: z.string() })).optional(),
    doctrines: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string(), uri: z.string() })).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const parts: any[] = [];
    let contextStr = '';
    const geminiNativeMimes = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

    for (const f of parsed.data.files) {
      if (geminiNativeMimes.includes(f.type)) {
        parts.push({ inlineData: { data: f.data, mimeType: f.type } });
      } else {
        contextStr += `\nCONTEÚDO ARQUIVO ${f.name}: ${f.data}`;
      }
    }

    if (parsed.data.jurisprudence?.length) {
      contextStr += `\n\nTESES JURISPRUDENCIAIS PARA USAR:\n${parsed.data.jurisprudence.map(j => `Julgado: ${j.title}`).join('\n')}`;
    }
    if (parsed.data.doctrines?.length) {
      contextStr += `\n\nREFERÊNCIAS DOUTRINÁRIAS/ACADÊMICAS:\n${parsed.data.doctrines.map(d => `Artigo: ${d.title}`).join('\n')}`;
    }

    parts.push({ text: `${contextStr}\n\nSOLICITAÇÃO: ${parsed.data.prompt}` });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: "Você é um Redator Jurídico Sênior LexAI. Escreva peças em HTML limpo (p, b, h1, br). IMPORTANTE: Jamais coloque Local, Data ou Assinatura ao final, o sistema fará isso automaticamente.",
        temperature: 0.2
      }
    });
    res.json({ data: { html: response.text?.replace(/```html/gi, '').replace(/```/g, '').trim() || '' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao gerar peça.' });
  }
});

app.post('/api/ai/extract-data', async (req, res) => {
  const schema = z.object({ base64: z.string(), mimeType: z.string(), prompt: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: parsed.data.base64, mimeType: parsed.data.mimeType } },
          { text: parsed.data.prompt }
        ]
      },
      config: { responseMimeType: 'application/json' }
    });
    res.json({ data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao extrair dados.' });
  }
});

app.post('/api/ai/unified-action', async (req, res) => {
  const schema = z.object({
    query: z.string(),
    files: z.array(z.object({
      id: z.string(),
      name: z.string(),
      data: z.string(),
      type: z.string(),
      role: z.string()
    })),
    appContext: z.any()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  try {
    const ai = getAI();
    const parts: any[] = [];
    parsed.data.files.forEach(file => {
      parts.push({ inlineData: { data: file.data, mimeType: file.type } });
    });
    parts.push({ text: parsed.data.query });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts },
      config: {
        systemInstruction: `Você é a LexAI. Contexto do escritório: ${JSON.stringify(parsed.data.appContext)}`
      }
    });
    res.json({ data: { text: response.text || '' } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao processar comando.' });
  }
});

app.get('/api/contacts', (_req, res) => {
  const contacts = db.prepare('SELECT * FROM contacts').all().map(mapContact);
  res.json({ data: contacts });
});

const contactSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  document: z.string(),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  type: z.enum(['Individual', 'Empresa']),
  totalMatters: z.number().int().nonnegative(),
  folderId: z.string(),
  category: z.string().optional().nullable(),
  financialStatus: z.string().optional().nullable()
});

app.post('/api/contacts', (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO contacts (id, name, document, email, phone, type, total_matters, folder_id, category, financial_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.name,
    payload.document,
    payload.email ?? '',
    payload.phone ?? '',
    payload.type,
    payload.totalMatters,
    payload.folderId,
    payload.category ?? null,
    payload.financialStatus ?? null
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.get('/api/contracts', (_req, res) => {
  const contracts = db.prepare('SELECT * FROM contracts').all().map(mapContract);
  res.json({ data: contracts });
});

const contractSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  type: z.string(),
  monthlyValue: z.number().optional(),
  successPercentage: z.number().optional(),
  validity: z.string(),
  status: z.string(),
  adjustments: z.string(),
  specialConditions: z.string()
});

app.post('/api/contracts', (req, res) => {
  const parsed = contractSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO contracts (id, client_id, type, monthly_value, success_percentage, validity, status, adjustments, special_conditions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.clientId,
    payload.type,
    payload.monthlyValue ?? null,
    payload.successPercentage ?? null,
    payload.validity,
    payload.status,
    payload.adjustments,
    payload.specialConditions
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.get('/api/matters', (_req, res) => {
  const matters = db.prepare('SELECT * FROM matters').all().map(mapMatter);
  res.json({ data: matters });
});

const matterSchema = z.object({
  id: z.string().optional(),
  number: z.string(),
  title: z.string(),
  client: z.string(),
  opposingParty: z.string().optional().nullable(),
  status: z.enum(['Aberto', 'Fechado', 'Pendente']),
  type: z.string(),
  responsible: z.string(),
  openDate: z.string(),
  billableHours: z.number().nonnegative(),
  lastMovementSummary: z.string().optional().nullable()
});

app.post('/api/matters', (req, res) => {
  const parsed = matterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO matters (id, number, title, client, opposing_party, status, type, responsible, open_date, billable_hours, last_movement_summary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.number,
    payload.title,
    payload.client,
    payload.opposingParty ?? null,
    payload.status,
    payload.type,
    payload.responsible,
    payload.openDate,
    payload.billableHours,
    payload.lastMovementSummary ?? null
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.patch('/api/matters/:id', (req, res) => {
  const schema = z.object({
    lastMovementSummary: z.string().optional(),
    updates: z.array(z.object({
      id: z.string(),
      date: z.string(),
      content: z.string(),
      source: z.string(),
      type: z.string()
    })).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const matter = db.prepare('SELECT * FROM matters WHERE id = ?').get(req.params.id) as any;
  if (!matter) {
    return res.status(404).json({ error: 'Processo não encontrado.' });
  }
  const nextSummary = parsed.data.lastMovementSummary ?? matter.last_movement_summary;
  db.prepare('UPDATE matters SET last_movement_summary = ? WHERE id = ?').run(nextSummary, req.params.id);
  if (parsed.data.updates) {
    db.prepare('DELETE FROM case_updates WHERE matter_id = ?').run(req.params.id);
    const insert = db.prepare(`
      INSERT INTO case_updates (id, matter_id, date, content, source, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    parsed.data.updates.forEach(update => {
      insert.run(update.id, req.params.id, update.date, update.content, update.source, update.type);
    });
  }
  res.json({ data: mapMatter({ ...matter, last_movement_summary: nextSummary }) });
});

app.get('/api/hearings', (_req, res) => {
  const hearings = db.prepare('SELECT * FROM hearings').all().map(mapHearing);
  res.json({ data: hearings });
});

const hearingSchema = z.object({
  id: z.string().optional(),
  matterId: z.string(),
  matterNumber: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  type: z.string(),
  date: z.string(),
  time: z.string(),
  court: z.string(),
  modality: z.string(),
  responsible: z.string(),
  settlementProbability: z.number(),
  valueInvolved: z.number(),
  result: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

app.post('/api/hearings', (req, res) => {
  const parsed = hearingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO hearings (id, matter_id, matter_number, client_id, client_name, type, date, time, court, modality, responsible, settlement_probability, value_involved, result, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.matterId,
    payload.matterNumber,
    payload.clientId,
    payload.clientName,
    payload.type,
    payload.date,
    payload.time,
    payload.court,
    payload.modality,
    payload.responsible,
    payload.settlementProbability,
    payload.valueInvolved,
    payload.result ?? null,
    payload.notes ?? null
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.patch('/api/hearings/:id', (req, res) => {
  const schema = z.object({ result: z.string().optional(), notes: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const hearing = db.prepare('SELECT * FROM hearings WHERE id = ?').get(req.params.id) as any;
  if (!hearing) {
    return res.status(404).json({ error: 'Audiência não encontrada.' });
  }
  const nextResult = parsed.data.result ?? hearing.result;
  const nextNotes = parsed.data.notes ?? hearing.notes;
  db.prepare('UPDATE hearings SET result = ?, notes = ? WHERE id = ?').run(nextResult, nextNotes, req.params.id);
  res.json({ data: mapHearing({ ...hearing, result: nextResult, notes: nextNotes }) });
});

app.get('/api/agenda', (_req, res) => {
  const events = db.prepare('SELECT * FROM agenda_events').all().map(mapAgenda);
  res.json({ data: events });
});

const agendaSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  date: z.string(),
  timeStart: z.string(),
  timeEnd: z.string(),
  sourceId: z.string(),
  matterId: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  responsible: z.string(),
  title: z.string()
});

app.post('/api/agenda', (req, res) => {
  const parsed = agendaSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO agenda_events (id, type, date, time_start, time_end, source_id, matter_id, client_name, responsible, title)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.type,
    payload.date,
    payload.timeStart,
    payload.timeEnd,
    payload.sourceId,
    payload.matterId ?? null,
    payload.clientName ?? null,
    payload.responsible,
    payload.title
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.get('/api/activities', (_req, res) => {
  const entries = db.prepare('SELECT * FROM activities ORDER BY created_at DESC').all().map(mapActivity);
  res.json({ data: entries });
});

const activitySchema = z.object({
  id: z.string().optional(),
  matter: z.string(),
  description: z.string(),
  duration: z.string()
});

app.post('/api/activities', (req, res) => {
  const parsed = activitySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO activities (id, matter, description, duration, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, payload.matter, payload.description, payload.duration, createdAt);
  res.status(201).json({ data: { ...payload, id, createdAt } });
});

app.get('/api/executions', (_req, res) => {
  const executions = db.prepare('SELECT * FROM legal_executions').all().map((row: any) => ({
    id: row.id,
    clientId: row.client_id,
    matterId: row.matter_id,
    contractId: row.contract_id,
    defendant: row.defendant,
    origin: row.origin,
    valueExecuted: row.value_executed,
    valueRecovered: row.value_recovered,
    feePercentage: row.fee_percentage,
    feesDue: row.fees_due,
    feesPaid: row.fees_paid,
    status: row.status
  }));
  res.json({ data: executions });
});

const executionSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  matterId: z.string(),
  contractId: z.string(),
  defendant: z.string(),
  origin: z.string(),
  valueExecuted: z.number(),
  valueRecovered: z.number(),
  feePercentage: z.number(),
  feesDue: z.number(),
  feesPaid: z.number(),
  status: z.string()
});

app.post('/api/executions', (req, res) => {
  const parsed = executionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO legal_executions (id, client_id, matter_id, contract_id, defendant, origin, value_executed, value_recovered, fee_percentage, fees_due, fees_paid, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.clientId,
    payload.matterId,
    payload.contractId,
    payload.defendant,
    payload.origin,
    payload.valueExecuted,
    payload.valueRecovered,
    payload.feePercentage,
    payload.feesDue,
    payload.feesPaid,
    payload.status
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.get('/api/files', (req, res) => {
  const clientId = req.query.clientId as string | undefined;
  const rows = clientId
    ? db.prepare('SELECT * FROM client_files WHERE client_id = ?').all(clientId)
    : db.prepare('SELECT * FROM client_files').all();
  const files = rows.map((row: any) => ({
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    type: row.type,
    size: row.size,
    data: row.data,
    date: row.date
  }));
  res.json({ data: files });
});

const fileSchema = z.object({
  id: z.string().optional(),
  clientId: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
  data: z.string(),
  date: z.string()
});

app.post('/api/files', (req, res) => {
  const parsed = fileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = payload.id ?? Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO client_files (id, client_id, name, type, size, data, date)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, payload.clientId, payload.name, payload.type, payload.size, payload.data, payload.date);
  res.status(201).json({ data: { ...payload, id } });
});

app.delete('/api/files/:id', (req, res) => {
  db.prepare('DELETE FROM client_files WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

app.get('/api/billing/cycles', (_req, res) => {
  const cycles = db.prepare('SELECT * FROM billing_cycles').all().map(mapBillingCycle);
  res.json({ data: cycles });
});

const billingCycleSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  period: z.string(),
  type: z.string(),
  baseValue: z.number().nonnegative(),
  successFeeValue: z.number().nonnegative(),
  totalValue: z.number().nonnegative(),
  status: z.string(),
  requirements: z.record(z.boolean()),
  dueDate: z.string()
});

app.post('/api/billing/cycles', (req, res) => {
  const parsed = billingCycleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const payload = parsed.data;
  const id = Math.random().toString(36).slice(2, 9);
  db.prepare(`
    INSERT INTO billing_cycles (id, client_id, client_name, period, type, base_value, success_fee_value, total_value, status, requirements, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    payload.clientId,
    payload.clientName,
    payload.period,
    payload.type,
    payload.baseValue,
    payload.successFeeValue,
    payload.totalValue,
    payload.status,
    JSON.stringify(payload.requirements),
    payload.dueDate
  );
  res.status(201).json({ data: { ...payload, id } });
});

app.patch('/api/billing/cycles/:id', (req, res) => {
  const schema = z.object({
    status: z.string().optional(),
    requirements: z.record(z.boolean()).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const cycle = db.prepare('SELECT * FROM billing_cycles WHERE id = ?').get(req.params.id) as any;
  if (!cycle) {
    return res.status(404).json({ error: 'Ciclo não encontrado.' });
  }
  const nextStatus = parsed.data.status ?? cycle.status;
  const nextRequirements = parsed.data.requirements ? JSON.stringify(parsed.data.requirements) : cycle.requirements;
  db.prepare('UPDATE billing_cycles SET status = ?, requirements = ? WHERE id = ?').run(nextStatus, nextRequirements, req.params.id);
  res.json({ data: mapBillingCycle({ ...cycle, status: nextStatus, requirements: nextRequirements }) });
});

app.post('/api/billing/sync', (_req, res) => {
  res.json({ data: { message: 'Sincronização concluída com sucesso.', syncedAt: new Date().toISOString() } });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(port, () => {
  console.log(`LexAI backend listening on port ${port}`);
});

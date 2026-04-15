import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const targets = [
  { id: 'citypubli', nome: 'CityPubli', url: 'https://crm.citypubli.com.br/criacao-de-site-para-medicos/' },
  { id: 'time4u', nome: 'Time4U', url: 'https://time4u.com.br/' },
  { id: 'greatpages', nome: 'GreatPages', url: 'https://www.greatpages.com.br/' },
  { id: 'futuremarketing', nome: 'Future Marketing', url: 'https://www.futuremarketing.com.br/site-para-medico' },
  { id: 'agenciadomedico', nome: 'Agência do Médico', url: 'https://agenciadomedico.com.br/site-medico/' },
  { id: 'sitemedicos', nome: 'SiteMédicos', url: 'https://www.sitemedicos.com.br/' },
  { id: 'doctorapp', nome: 'DoctorApp', url: 'https://www.doctorapp.com.br/sites-para-medicos-criacao-de-website-medico' }
];

function uniqueTexts(arr, max = 20) {
  const set = new Set();
  for (const item of arr) {
    const t = (item || '').replace(/\s+/g, ' ').trim();
    if (!t) continue;
    if (t.length < 4 || t.length > 140) continue;
    set.add(t);
    if (set.size >= max) break;
  }
  return [...set];
}

const re = {
  price: /R\$\s?\d{2,4}|\d{1,2}x\s?(sem juros|de)/i,
  urgency: /hoje|agora|vagas|limitad|encerr|urgente|últimas?/i,
  guarantee: /garantia|satisfaç|risco zero|reembolso/i,
  authority: /médic|crm|rqe|especialista|autoridade|anos de mercado|case/i,
  conversion: /whatsapp|agendar|consulta|fale conosco|entre em contato|solicite/i,
  speed: /24h|48h|rápid|imediat|express/i,
  socialProof: /depoimento|case|clientes|resultados|avaliaç|prova social/i
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'pt-BR'
});

const report = [];

for (const t of targets) {
  const page = await context.newPage();
  let error = null;
  try {
    await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForTimeout(9000);
    const data = await page.evaluate((patterns) => {
      const text = (document.body?.innerText || '').replace(/\s+/g, ' ').trim();
      const nodes = Array.from(document.querySelectorAll('h1,h2,h3,a,button,p,li,span'));
      const allTexts = nodes.map(n => (n.textContent || '').trim());
      const h1 = Array.from(document.querySelectorAll('h1')).map(n => n.textContent || '');
      const h2 = Array.from(document.querySelectorAll('h2')).map(n => n.textContent || '');
      const ctas = Array.from(document.querySelectorAll('a,button'))
        .map(el => (el.textContent || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .filter(t => t.length >= 3 && t.length <= 70);

      const hrefs = Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href') || '');
      const forms = document.querySelectorAll('form').length;

      const test = (name) => new RegExp(patterns[name], 'i').test(text);

      return {
        title: document.title || '',
        metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        finalUrl: location.href,
        textSample: text.slice(0, 9000),
        h1,
        h2,
        allTexts,
        ctas,
        forms,
        whatsappLinks: hrefs.filter(h => /wa\.me|whatsapp/i.test(h)).length,
        phoneLinks: hrefs.filter(h => /^tel:/i.test(h)).length,
        hasPrice: test('price'),
        hasUrgency: test('urgency'),
        hasGuarantee: test('guarantee'),
        hasAuthority: test('authority'),
        hasConversion: test('conversion'),
        hasSpeed: test('speed'),
        hasSocialProof: test('socialProof')
      };
    }, {
      price: re.price.source,
      urgency: re.urgency.source,
      guarantee: re.guarantee.source,
      authority: re.authority.source,
      conversion: re.conversion.source,
      speed: re.speed.source,
      socialProof: re.socialProof.source
    });

    report.push({
      ...t,
      ...data,
      h1: uniqueTexts(data.h1, 8),
      h2: uniqueTexts(data.h2, 12),
      ctas: uniqueTexts(data.ctas, 20),
      highlights: uniqueTexts(data.allTexts.filter(x =>
        /médic|pacient|consulta|site|landing|autoridade|agend|resultado|google|whatsapp|tráfego/i.test(x)
      ), 30)
    });
  } catch (e) {
    error = String(e?.message || e);
    report.push({ ...t, error });
  } finally {
    await page.close();
  }
}

await browser.close();
await fs.writeFile('concorrentes/dados/benchmark.json', JSON.stringify(report, null, 2), 'utf8');
console.log('OK -> concorrentes/dados/benchmark.json');

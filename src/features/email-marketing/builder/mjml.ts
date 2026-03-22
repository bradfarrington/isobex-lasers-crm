import mjml2html from 'mjml-browser';
import { BRAND, replaceMergeTags, loadGoogleFont } from './constants';
import type { BlockData } from './constants';

function inlineQuillStyles(html: string, linkColor: string): string {
  if (!html) return html;
  const lc = linkColor || BRAND;
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/class="ql-align-center"/g, 'style="text-align:center"')
    .replace(/class="ql-align-right"/g, 'style="text-align:right"')
    .replace(/class="ql-align-justify"/g, 'style="text-align:justify"')
    .replace(/<a /g, `<a style="color:${lc};text-decoration:underline" `);
}

export function blockToMjml(block: BlockData, gs: Record<string, any> = {}, preserveTags = false): string {
  const { type, data } = block;
  const font = data.fontFamily || gs.fontFamily || "'Inter', sans-serif";
  const tc = gs.textColor || '#1f2937';
  const lc = gs.linkColor || BRAND;
  const w = gs.width || 600;
  const p = data.padding || {};
  const ps = `${p.top||0}px ${p.right||0}px ${p.bottom||0}px ${p.left||0}px`;

  switch (type) {
    case 'heading': {
      const sz = data.level === 'h1' ? '28px' : data.level === 'h3' ? '18px' : '22px';
      return `<mj-text color="${data.color||tc}" padding="${ps}" font-size="${sz}" font-weight="700" line-height="1.3" font-family="${font}">${inlineQuillStyles(replaceMergeTags(data.content, preserveTags), lc)}</mj-text>`;
    }
    case 'text':
      return `<mj-text color="${data.color||tc}" font-size="15px" line-height="1.7" padding="${ps}" font-family="${font}">${inlineQuillStyles(replaceMergeTags(data.content, preserveTags), lc)}</mj-text>`;
    case 'image': {
      if (!data.src) return '';
      const iw = data.width ? Math.round((Number(data.width)/100)*w) : w;
      const r = data.borderRadius ? `border-radius="${data.borderRadius}px"` : '';
      return `<mj-image src="${data.src}" alt="${data.alt||''}" width="${iw}px" align="${data.align||'center'}" padding="${ps}" ${r} />`;
    }
    case 'button':
      return `<mj-button href="${replaceMergeTags(data.link||'#', preserveTags)}" align="${data.align||'center'}" padding="${ps}" inner-padding="${data.paddingV||12}px ${data.paddingH||32}px" background-color="${data.bgColor||BRAND}" color="${data.textColor||'#fff'}" border-radius="${data.borderRadius||8}px" font-weight="${data.fontWeight||600}" font-size="${data.fontSize||15}px" font-family="${font}" ${data.fullWidth?'width="100%"':''}>${data.text||'Button'}</mj-button>`;
    case 'divider':
      return `<mj-divider border-width="${data.thickness||1}px" border-style="${data.style||'solid'}" border-color="${data.color||'#e5e7eb'}" width="${data.width||100}%" padding="${data.marginTop||8}px 0 ${data.marginBottom||8}px" />`;
    case 'spacer':
      return `<mj-spacer height="${data.height||32}px" />`;
    case 'merge_tag':
      return `<mj-text padding="${ps}" font-size="${data.fontSize||15}px" font-weight="${data.fontWeight||400}" color="${data.color||tc}" font-family="${font}">${replaceMergeTags(data.tag||'', preserveTags)}</mj-text>`;
    case 'columns': {
      const parts = (data.layout||'50-50').split('-').map(Number);
      const cols = data.columns || [];
      const html = cols.map((col: any, i: number) => {
        const pct = parts[i] || 50;
        const inner = (col.blocks||[]).map((sb: BlockData) => blockToMjml(sb, gs, preserveTags)).join('');
        return `<mj-column width="${pct}%" padding="12px" vertical-align="${data.verticalAlign||'top'}">${inner||'<mj-text>&nbsp;</mj-text>'}</mj-column>`;
      }).join('');
      return `<mj-section padding="${ps}">${html}</mj-section>`;
    }
    default: return '';
  }
}

export function generateEmailHtml(blocks: BlockData[], settings: Record<string, any>, preserveTags = false): string {
  const font = settings.fontFamily || "'Inter', sans-serif";
  const fontName = font.replace(/'/g,'').split(',')[0].trim();
  const tc = settings.textColor || '#1f2937';
  const lc = settings.linkColor || BRAND;
  const bodyBg = settings.bodyBg || '#f5f5f5';
  const contentBg = settings.contentBg || '#ffffff';
  const w = settings.width || 600;

  if (fontName && fontName !== 'System Default') loadGoogleFont(fontName);

  const fontTag = fontName && fontName !== 'System Default'
    ? `<mj-font name="${fontName}" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;600;700&display=swap" />`
    : '';

  const blocksMjml = blocks.map(b => {
    const piece = blockToMjml(b, settings, preserveTags);
    if (!piece) return '';
    if (b.type === 'columns') return piece;
    return `<mj-section padding="8px 0"><mj-column width="100%">${piece}</mj-column></mj-section>`;
  }).join('');

  const logoMjml = settings.logoUrl ? `<mj-section padding="24px 0"><mj-column width="100%"><mj-image src="${settings.logoUrl}" alt="Logo" width="160px" align="center" padding="0" /></mj-column></mj-section>` : '';
  const footerMjml = settings.footerText ? `<mj-section padding="0"><mj-column width="100%"><mj-divider border-width="1px" border-color="#e5e7eb" width="100%" padding="0" /></mj-column></mj-section><mj-section padding="16px 24px"><mj-column width="100%"><mj-text align="center" font-size="12px" line-height="1.6" color="#9ca3af" font-family="${font}">${replaceMergeTags(settings.footerText, preserveTags)}</mj-text></mj-column></mj-section>` : '';
  const previewMjml = settings.previewText ? `<mj-preview>${settings.previewText}</mj-preview>` : '';

  const mjml = `<mjml><mj-head><mj-title>${settings.subject||''}</mj-title>${previewMjml}${fontTag}<mj-attributes><mj-all font-family="${font}" /><mj-text font-size="15px" color="${tc}" line-height="1.7" /></mj-attributes><mj-style>a{color:${lc};text-decoration:underline}p{margin:0}p:empty,p br:only-child{min-height:1em;display:block}h1,h2,h3{margin:0 0 4px;font-weight:700}</mj-style></mj-head><mj-body background-color="${bodyBg}" width="${w}px"><mj-wrapper background-color="${contentBg}" padding="24px 20px" border-radius="8px">${logoMjml}${blocksMjml||'<mj-section padding="24px 0"><mj-column width="100%"><mj-text align="center" color="#9ca3af" padding="48px 0">No content blocks</mj-text></mj-column></mj-section>'}${footerMjml}</mj-wrapper></mj-body></mjml>`;

  try {
    const { html } = mjml2html(mjml, { validationLevel: 'soft' });
    return html;
  } catch (e: any) {
    return `<p>Error: ${e.message}</p>`;
  }
}

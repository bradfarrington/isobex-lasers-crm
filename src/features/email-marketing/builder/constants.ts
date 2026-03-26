import {
  Type, AlignLeft, Image, MousePointerClick, Minus, Square,
  Columns2, Tag, Code, Share2, Play, Timer, ShoppingBag, Receipt, Gift,
} from 'lucide-react';

export const BRAND = '#dc2626';

export const QUILL_FULL = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ['link'],
    ['clean'],
  ],
};

export const QUILL_HEADING = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ align: [] }],
    [{ color: [] }],
    ['clean'],
  ],
};

export const QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'align', 'color', 'background', 'link',
];

export const GOOGLE_FONTS = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Outfit',
  'Nunito','Raleway','Work Sans','DM Sans','Quicksand','Manrope',
  'Playfair Display','Merriweather','Lora','Cormorant Garamond',
  'Bebas Neue','Oswald','Dancing Script','Caveat',
].map(n => ({ name: n, value: `'${n}', sans-serif` }));

export const MERGE_TAGS = [
  { group: 'Contact', tags: [
    { key: '{{contact_name}}', label: 'Full Name' },
    { key: '{{contact_first_name}}', label: 'First Name' },
    { key: '{{contact_last_name}}', label: 'Last Name' },
    { key: '{{contact_email}}', label: 'Email' },
    { key: '{{contact_phone}}', label: 'Phone' },
  ]},
  { group: "Contact's Company", tags: [
    { key: '{{company_name}}', label: 'Company Name' },
    { key: '{{company_website}}', label: 'Company Website' },
  ]},
  { group: 'Your Business', tags: [
    { key: '{{business_name}}', label: 'Business Name' },
    { key: '{{business_email}}', label: 'Business Email' },
    { key: '{{business_phone}}', label: 'Business Phone' },
    { key: '{{business_website}}', label: 'Business Website' },
    { key: '{{business_address}}', label: 'Business Address' },
  ]},
  { group: 'Order', tags: [
    { key: '{{customer_name}}', label: 'Customer Name' },
    { key: '{{order_number}}', label: 'Order Number' },
    { key: '{{order_subtotal}}', label: 'Subtotal' },
    { key: '{{order_shipping}}', label: 'Shipping Cost' },
    { key: '{{order_vat}}', label: 'VAT (20%)' },
    { key: '{{order_total}}', label: 'Order Total' },
    { key: '{{order_items_table}}', label: 'Items Table' },
    { key: '{{order_price_breakdown}}', label: 'Price Breakdown' },
  ]},
  { group: 'Utility', tags: [
    { key: '{{current_date}}', label: 'Current Date' },
    { key: '{{current_year}}', label: 'Current Year' },
    { key: '{{unsubscribe_link}}', label: 'Unsubscribe Link' },
  ]},
  { group: 'Gift Card', tags: [
    { key: '{{recipient_name}}', label: 'Recipient Name' },
    { key: '{{sender_name}}', label: 'Sender Name' },
    { key: '{{gift_card_code}}', label: 'Gift Card Code' },
    { key: '{{gift_card_amount}}', label: 'Gift Card Amount' },
    { key: '{{gift_card_message}}', label: 'Personal Message' },
    { key: '{{gift_card_expiry}}', label: 'Expiry Date' },
  ]},
];

export const SAMPLE_DATA: Record<string, string> = {
  '{{contact_name}}': 'John Smith',
  '{{contact_first_name}}': 'John',
  '{{contact_last_name}}': 'Smith',
  '{{contact_email}}': 'john@example.com',
  '{{contact_phone}}': '07700 900000',
  '{{company_name}}': 'Acme Ltd',
  '{{company_website}}': 'https://acme.co.uk',
  '{{business_name}}': 'Isobex Lasers',
  '{{business_email}}': 'info@isobexlasers.com',
  '{{business_phone}}': '+44 1234 567890',
  '{{business_website}}': 'https://isobexlasers.com',
  '{{business_address}}': '123 Industrial Way, Sheffield, S1 1AA',
  '{{current_date}}': new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  '{{current_year}}': String(new Date().getFullYear()),
  '{{unsubscribe_link}}': '#',
  '{{customer_name}}': 'John Smith',
  '{{order.customer.name}}': 'John Smith',
  '{{order_number}}': '1042',
  '{{order.name}}': '1042',
  '{{order_subtotal}}': '£189.98',
  '{{order_shipping}}': '£5.99',
  '{{order_vat}}': '£39.19',
  '{{order_total}}': '£235.16',
  '{{order_items_table}}': `<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Product</th><th style="padding:10px 12px;text-align:center;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Qty</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Price</th><th style="padding:10px 12px;text-align:right;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.5px;">Total</th></tr></thead><tbody><tr><td style="padding:12px;border-bottom:1px solid #eee;"><div style="display:flex;align-items:center;gap:12px;"><img src="https://placehold.co/48x48/f3f4f6/888?text=IL" style="width:48px;height:48px;border-radius:6px;object-fit:cover;" /><div><div style="font-weight:600;">CO2 Laser Cutting Head</div><div style="font-size:12px;color:#888;">Standard</div></div></div></td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">1</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">£149.99</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">£149.99</td></tr><tr><td style="padding:12px;border-bottom:1px solid #eee;"><div style="display:flex;align-items:center;gap:12px;"><img src="https://placehold.co/48x48/f3f4f6/888?text=IL" style="width:48px;height:48px;border-radius:6px;object-fit:cover;" /><div><div style="font-weight:600;">Replacement Lens Kit</div><div style="font-size:12px;color:#888;">25mm</div></div></div></td><td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">2</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">£19.99</td><td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">£39.98</td></tr></tbody></table>`,
  '{{order_price_breakdown}}': `<table style="width:100%;border-collapse:collapse;"><tr><td style="padding:6px 12px;color:#555;">Subtotal</td><td style="padding:6px 12px;text-align:right;">£189.98</td></tr><tr><td style="padding:6px 12px;color:#555;">Shipping</td><td style="padding:6px 12px;text-align:right;">£5.99</td></tr><tr><td style="padding:6px 12px;color:#555;">VAT (20%)</td><td style="padding:6px 12px;text-align:right;">£39.19</td></tr><tr style="border-top:2px solid #1a1a1a;"><td style="padding:10px 12px;font-weight:700;font-size:16px;">Total</td><td style="padding:10px 12px;text-align:right;font-weight:700;font-size:16px;color:#dc2626;">£235.16</td></tr></table>`,
  '{{recipient_name}}': 'Jane Doe',
  '{{sender_name}}': 'John Smith',
  '{{gift_card_code}}': 'ABCD-1234-EFGH-5678',
  '{{gift_card_amount}}': '£50.00',
  '{{gift_card_message}}': 'Happy Birthday! Hope you find something you love.',
  '{{gift_card_message_intro}}': ' with a message',
  '{{gift_card_expiry}}': '26 March 2027',
};

export interface BlockData {
  id: string;
  type: string;
  data: Record<string, any>;
}

export interface BlockDef {
  type: string;
  label: string;
  icon: any;
}

export const SOCIAL_PLATFORMS = [
  { key: 'facebook', label: 'Facebook', color: '#1877F2' },
  { key: 'instagram', label: 'Instagram', color: '#E4405F' },
  { key: 'x', label: 'X (Twitter)', color: '#000000' },
  { key: 'youtube', label: 'YouTube', color: '#FF0000' },
  { key: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
  { key: 'tiktok', label: 'TikTok', color: '#000000' },
];

export const BLOCK_GROUPS: { label: string; blocks: BlockDef[] }[] = [
  { label: 'Content', blocks: [
    { type: 'heading', label: 'Heading', icon: Type },
    { type: 'text', label: 'Text', icon: AlignLeft },
    { type: 'image', label: 'Image', icon: Image },
    { type: 'button', label: 'Button', icon: MousePointerClick },
    { type: 'video', label: 'Video', icon: Play },
    { type: 'social', label: 'Social Links', icon: Share2 },
  ]},
  { label: 'Layout', blocks: [
    { type: 'divider', label: 'Divider', icon: Minus },
    { type: 'spacer', label: 'Spacer', icon: Square },
    { type: 'columns', label: 'Columns', icon: Columns2 },
  ]},
  { label: 'Dynamic', blocks: [
    { type: 'merge_tag', label: 'Merge Tag', icon: Tag },
    { type: 'countdown', label: 'Countdown', icon: Timer },
    { type: 'product', label: 'Product', icon: ShoppingBag },
    { type: 'order_details', label: 'Order Details', icon: Receipt },
    { type: 'gift_card_visual', label: 'Gift Card', icon: Gift },
  ]},
  { label: 'Advanced', blocks: [
    { type: 'html', label: 'Custom HTML', icon: Code },
  ]},
];

export const BLOCK_TYPE_MAP = Object.fromEntries(
  BLOCK_GROUPS.flatMap(g => g.blocks).map(b => [b.type, b])
);

export function makeBlock(type: string): BlockData {
  const defaults: Record<string, any> = {
    heading: { content: '<p>Your Heading Here</p>', level: 'h2', color: '', bgColor: '', fontFamily: '', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    text: { content: '<p>Write your email content here.</p>', color: '', bgColor: '', fontFamily: '', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    image: { src: '', alt: '', width: '100', align: 'center', link: '', borderRadius: '0', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    button: { text: 'Learn More', link: '#', align: 'center', bgColor: BRAND, textColor: '#ffffff', borderRadius: '8', fullWidth: false, fontSize: '15', fontWeight: '600', paddingV: '12', paddingH: '32', fontFamily: '', padding: { top: 8, right: 0, bottom: 8, left: 0 } },
    divider: { style: 'solid', color: '#e5e7eb', thickness: '1', width: '100', marginTop: '8', marginBottom: '8', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    spacer: { height: '32', bgColor: '', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    columns: { layout: '50-50', columns: [{ blocks: [] }, { blocks: [] }], gap: '16', verticalAlign: 'top', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    merge_tag: { tag: '{{contact_name}}', fallback: '', fontSize: '15', fontWeight: '400', color: '', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    social: { platforms: { facebook: '', instagram: '', x: '', youtube: '', linkedin: '', tiktok: '' }, iconSize: '32', align: 'center', spacing: '12', iconStyle: 'filled', padding: { top: 8, right: 0, bottom: 8, left: 0 } },
    html: { content: '', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    video: { videoUrl: '', thumbnailUrl: '', alt: 'Video thumbnail', width: '100', align: 'center', borderRadius: '0', padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    countdown: { endDate: '', label: 'Offer ends', bgColor: BRAND, textColor: '#ffffff', fontSize: '18', padding: { top: 12, right: 0, bottom: 12, left: 0 } },
    product: { productId: '', showImage: true, showPrice: true, showDescription: false, buttonText: 'Shop Now', buttonColor: BRAND, padding: { top: 8, right: 0, bottom: 8, left: 0 } },
    order_details: { showImages: true, showBreakdown: true, padding: { top: 8, right: 0, bottom: 8, left: 0 } },
    gift_card_visual: { design: 'classic', padding: { top: 12, right: 20, bottom: 12, left: 20 } },
  };
  return { id: crypto.randomUUID(), type, data: JSON.parse(JSON.stringify(defaults[type] || {})) };
}

const _loadedFonts = new Set<string>();
export function loadGoogleFont(name: string) {
  if (!name || _loadedFonts.has(name)) return;
  _loadedFonts.add(name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

export function tagLabel(key: string): string {
  for (const g of MERGE_TAGS) {
    const t = g.tags.find(t => t.key === key);
    if (t) return `${g.group}: ${t.label}`;
  }
  return key;
}

export function cleanHtml(html: string): string {
  if (!html) return html;
  return html.replace(/&nbsp;/g, ' ').replace(/\u00A0/g, ' ');
}

export function replaceMergeTags(text: string, preserveTags = false, customData?: Record<string, string>): string {
  if (!text) return text;
  if (preserveTags) return text;
  const source = customData || SAMPLE_DATA;
  return text.replace(/\{\{([^}]+)\}\}/g, (match, inner) => {
    // Strip any HTML tags that Quill might have accidentally injected inside the braces
    const cleanInner = inner.replace(/<[^>]*>?/gm, '').trim().toLowerCase();
    const key = `{{${cleanInner}}}`;
    return source[key] !== undefined ? source[key] : match;
  });
}

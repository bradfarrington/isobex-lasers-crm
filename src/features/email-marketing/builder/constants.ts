import {
  Type, AlignLeft, Image, MousePointerClick, Minus, Square,
  Columns2, Tag, Code, Share2, Play, Timer, ShoppingBag,
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
  { group: 'Utility', tags: [
    { key: '{{current_date}}', label: 'Current Date' },
    { key: '{{current_year}}', label: 'Current Year' },
    { key: '{{unsubscribe_link}}', label: 'Unsubscribe Link' },
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

export function replaceMergeTags(text: string, preserveTags = false): string {
  if (!text) return text;
  if (preserveTags) return text;
  return text.replace(/\{\{[^}]+\}\}/g, m => SAMPLE_DATA[m] || m);
}

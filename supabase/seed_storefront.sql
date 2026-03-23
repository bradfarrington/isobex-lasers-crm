-- Reset store config with premium industrial dark theme
UPDATE public.store_config
SET 
  store_name = 'Isobex Lasers',
  color_primary = '#E53E3E',
  color_secondary = '#2D3748',
  color_background = '#111111',
  color_surface = '#1A202C',
  color_text = '#FFFFFF',
  color_text_secondary = '#A0AEC0',
  font_headline = 'Inter',
  font_content = 'Inter',
  announcement_bar_active = true,
  announcement_bar_text = '📢 FREE SHIPPING ON UK ORDERS OVER £100',
  announcement_bar_color = '#E53E3E',
  announcement_bar_text_color = '#FFFFFF'
WHERE id IS NOT NULL;

-- Delete existing home page if any
DELETE FROM public.store_pages WHERE page_key = 'home';

-- Insert fresh, premium layout for Home Page
INSERT INTO public.store_pages (page_key, title, is_published, blocks)
VALUES (
  'home',
  'Home',
  true,
  '[
    {
      "id": "blk_hero",
      "type": "hero",
      "config": {
        "title": "High-Performance Laser Machine Parts",
        "subtitle": "Engineered for Accuracy, Built for Endurance. Trusted by industry leaders across the UK.",
        "bgImage": "https://storage.googleapis.com/msgsndr/XEKLcEf1Xlnf72ABaYI6/media/68df86475a4d7f82e3c1bd4a.jpeg",
        "alignment": "center",
        "overlayOpacity": 60,
        "height": "600px",
        "buttonText": "Shop Parts",
        "buttonLink": "/shop/products"
      }
    },
    {
      "id": "blk_ticker",
      "type": "ticker",
      "config": {
        "text": "⚡ GENUINE PARTS ⚡ NEXT DAY DELIVERY ⚡ EXPERT SUPPORT ⚡",
        "speed": 20,
        "bgColor": "#E53E3E",
        "textColor": "#FFFFFF"
      }
    },
    {
      "id": "blk_features",
      "type": "features",
      "config": {
        "items": [
          { "icon": "checkCircle", "title": "Genuine Quality", "description": "Maintain your system’s cutting quality with genuine parts designed to keep you running efficiently." },
          { "icon": "truck", "title": "Fast Delivery", "description": "Next day UK delivery available on all stock items to minimize your downtime." },
          { "icon": "shield", "title": "Built for Endurance", "description": "Each part is designed to withstand the rigors of high-performance daily operation." }
        ]
      }
    },
    {
      "id": "blk_collections",
      "type": "collection_showcase",
      "config": {
        "title": "CHOOSE YOUR CUTTING COMPONENTS",
        "subtitle": "Browse our most popular replacement part collections."
      }
    },
    {
      "id": "blk_banner",
      "type": "banner",
      "config": {
        "text": "Maintain your system’s cutting quality with genuine parts.",
        "bgColor": "#1A202C",
        "textColor": "#FFFFFF",
        "align": "center"
      }
    }
  ]'::jsonb
);

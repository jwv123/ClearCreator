import { Router } from 'express';

const GOOGLE_FONTS_API_KEY = process.env.GOOGLE_FONTS_API_KEY || '';
const GOOGLE_FONTS_API_URL = 'https://www.googleapis.com/webfonts/v1/webfonts';

const POPULAR_FONT_FAMILIES = [
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald',
  'Raleway', 'Poppins', 'Inter', 'Playfair Display', 'Merriweather',
  'Nunito', 'Ubuntu', 'PT Sans', 'Source Sans 3', 'Noto Sans',
  'Fira Sans', 'Work Sans', 'Rubik', 'Quicksand', 'Manrope',
  'DM Sans', 'Space Grotesk', 'Libre Baskerville', 'Crimson Text',
  'Josefin Sans', 'Abril Fatface', 'Bebas Neue', 'Permanent Marker',
  'Dancing Script', 'Indie Flower',
];

interface GoogleFontItem {
  family: string;
  variants: string[];
  category: string;
  files: Record<string, string>;
}

interface FontCache {
  data: any;
  timestamp: number;
}

let popularCache: FontCache | null = null;
let fullCache: FontCache | null = null;
const CACHE_TTL = 3600_000; // 1 hour

export const fontRouter = Router();

// GET /api/fonts/popular — curated subset of popular Google Fonts
fontRouter.get('/popular', async (_req, res) => {
  try {
    if (popularCache && Date.now() - popularCache.timestamp < CACHE_TTL) {
      res.json(popularCache.data);
      return;
    }

    if (!GOOGLE_FONTS_API_KEY) {
      res.json({ items: [] });
      return;
    }

    const response = await fetch(
      `${GOOGLE_FONTS_API_URL}?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
    );

    if (!response.ok) {
      throw new Error(`Google Fonts API returned ${response.status}`);
    }

    const data = await response.json();
    const popular = (data.items || [])
      .filter((item: GoogleFontItem) => POPULAR_FONT_FAMILIES.includes(item.family))
      .map((item: GoogleFontItem) => ({
        family: item.family,
        category: item.category,
        variants: item.variants,
        files: item.files,
      }));

    const result = { items: popular };
    popularCache = { data: result, timestamp: Date.now() };
    res.json(result);
  } catch (error: any) {
    console.error('Font API error (popular):', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/fonts — full Google Fonts catalog
fontRouter.get('/', async (_req, res) => {
  try {
    if (fullCache && Date.now() - fullCache.timestamp < CACHE_TTL) {
      res.json(fullCache.data);
      return;
    }

    if (!GOOGLE_FONTS_API_KEY) {
      res.json({ items: [] });
      return;
    }

    const response = await fetch(
      `${GOOGLE_FONTS_API_URL}?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
    );

    if (!response.ok) {
      throw new Error(`Google Fonts API returned ${response.status}`);
    }

    const data = await response.json();
    const items = (data.items || []).map((item: GoogleFontItem) => ({
      family: item.family,
      category: item.category,
      variants: item.variants,
      files: item.files,
    }));

    const result = { items };
    fullCache = { data: result, timestamp: Date.now() };
    res.json(result);
  } catch (error: any) {
    console.error('Font API error (full):', error.message);
    res.status(500).json({ error: error.message });
  }
});
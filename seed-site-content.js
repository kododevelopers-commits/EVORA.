const fs = require('fs');
const path = require('path');

// Load environment variables from assets/server/.env
const envPath = path.join(__dirname, 'assets', 'server', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('SUPABASE_URL or SUPABASE_SERVICE_KEY missing');
  process.exit(1);
}

const headers = {
  'apikey': serviceKey,
  'Authorization': 'Bearer ' + serviceKey,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates'
};

const initialData = [
  {
    id: 'carousel',
    key: 'carousel',
    version: 1,
    data: [
      {
        image: 'assets/d1.png',
        badge: 'NEW SEASON',
        title: 'New Season Deal',
        subtitle: 'Fresh arrivals, everyday luxury',
        buttonLabel: 'Shop Deal',
        buttonHref: 'menu.html'
      },
      {
        image: 'assets/d2.png',
        badge: 'LIMITED TIME',
        title: 'Midnight Munchies Deal',
        subtitle: 'Late night essentials',
        buttonLabel: 'Explore',
        buttonHref: 'menu.html'
      },
      {
        image: 'assets/d3.png',
        badge: 'FAMILY FEAST',
        title: 'Family Feast Deal',
        subtitle: 'Bundled for everyone',
        buttonLabel: 'View Sets',
        buttonHref: 'menu.html'
      },
      {
        image: 'assets/d4.png',
        badge: 'SPECIAL ROLL',
        title: 'Roll Combo Deal',
        subtitle: 'Curated apparel bundles',
        buttonLabel: 'Grab Deal',
        buttonHref: 'menu.html'
      }
    ]
  },
  {
    id: 'our-story',
    key: 'our-story',
    version: 1,
    data: {
      eyebrow: 'Our Story',
      title: 'Crafted to Wear, Built to Last',
      emphasis: 'Built to Last',
      description: 'Evora is a modern clothing label for everyday wear. We design clean, well-fitted pieces using quality fabrics — made to be layered, lived in, and loved across seasons.',
      points: [
        'Thoughtfully sourced, breathable fabrics',
        'Fits perfected on real bodies, not mannequins',
        'Small-batch production, less waste'
      ],
      buttons: [
        { label: 'Read Our Story', href: 'about.html' },
        { label: 'Shop the Collection', href: 'menu.html' }
      ]
    }
  },
  {
    id: 'footer',
    key: 'footer',
    version: 1,
    data: {
      tagline: 'Modern clothing, made for everyday life.',
      contactHeading: 'Contact us',
      phone: '0334-3745379',
      phoneHref: 'tel:03343745379',
      address: 'Studio — Karachi, Pakistan',
      followHeading: 'Follow us',
      facebookHref: '#',
      instagramHref: '#',
      helpHeading: 'Help',
      helpLinks: [
        { label: 'Contact Support', href: 'contact.html' },
        { label: 'Our Locations', href: 'contact.html' },
        { label: 'Blogs', href: 'about.html' },
        { label: 'Bank Discounts', href: 'contact.html' }
      ],
      poweredText: 'KODO',
      poweredHref: '#',
      bottomLinks: [
        { label: 'PRIVACY POLICY', href: '#' },
        { label: 'FAQS', href: '#' }
      ]
    }
  }
];

async function seed() {
  for (const item of initialData) {
    console.log('Upserting site content item:', item.key);
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/site_content`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(item)
      });
      const text = await res.text();
      console.log(`Status ${res.status}:`, text || '(empty response)');
    } catch (err) {
      console.error('Error seeding ' + item.key + ':', err.message);
    }
  }
}

seed();

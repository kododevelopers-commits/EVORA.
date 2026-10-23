// ============================================================================
// catalog.js — the single source of truth for the product catalogue.
// ----------------------------------------------------------------------------
// Everything that needs product data reads from this one file:
//
//   * the browser  — loaded via <script src="catalog.js">, exposes
//                    window.EVORA_CATALOG (used by script.js and product.html)
//   * the server   — assets/server/server.js does require('../../catalog.js')
//                    for /api/menu and for verifying order prices
//
// To add or change a product, edit it here and nowhere else. Prices used by
// the checkout are recomputed on the server from this file, so a tampered
// browser can no longer change what an order costs.
//
// Shape of each item:
//   id            unique slug, used in product.html?slug=... and the cart
//   name          display name (also the cart key today)
//   category      one of the ids in `categories` below
//   categoryLabel human-readable category name
//   price         integer rupees
//   description   shown on the product page
//   image         path relative to the site root
//   available     false hides the item from the shop grid
// ============================================================================

var EVORA_CATALOG = {
  categories: [
    { id: 'men', label: 'Men' },
    { id: 'women', label: 'Women' },
    { id: 'unisex', label: 'Unisex' }
  ],

  items: [
    {
      id: 'classic-crew-neck-tee',
      name: 'Classic Crew Neck Tee',
      category: 'men',
      categoryLabel: 'Men',
      price: 1899,
      description: 'A wardrobe staple. Soft 100% cotton, regular fit, ribbed crew neck, and pre-shrunk for a true fit wash after wash.',
      image: 'assets/vecteezy_formal-men-s-sky-blue-check-shirt-on-white-background_28629202.JPG',
      available: true
    },
    {
      id: 'floral-maxi-dress',
      name: 'Floral Maxi Dress',
      category: 'women',
      categoryLabel: 'Women',
      price: 3599,
      description: 'Light, flowy chiffon with a soft floral print. V-neckline, tiered hem and adjustable straps.',
      image: 'assets/vecteezy_handsome-young-man-in-tan-shirt-and-jeans-standing-against_65665582.jpeg',
      available: true
    },
    {
      id: 'slim-fit-denim-jeans',
      name: 'Slim Fit Denim Jeans',
      category: 'men',
      categoryLabel: 'Men',
      price: 3299,
      description: 'Mid-rise stretch denim with a dark indigo wash. Slim through the hip, thigh and leg.',
      image: 'assets/vecteezy_a-photograph-of-a-middle-aged-man-with-a-bald-head-and-a_59373353.jpg',
      available: true
    },
    {
      id: 'hooded-pullover-sweatshirt',
      name: 'Hooded Pullover Sweatshirt',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 2799,
      description: 'Brushed fleece inside, smooth outside. Kangaroo pocket, ribbed cuffs and hem for a snug fit.',
      image: 'assets/images.jfif',
      available: true
    },
    {
      id: 'high-waist-palazzo-pants',
      name: 'High-Waist Palazzo Pants',
      category: 'women',
      categoryLabel: 'Women',
      price: 2299,
      description: 'Wide leg, stretch fabric, all-day comfort. Pair with a tucked tee or crop top.',
      image: 'assets/vecteezy_handsome-young-man-in-tan-shirt-and-jeans-standing-against_65665582.jpeg',
      available: true
    },
    {
      id: 'embroidered-kurti',
      name: 'Embroidered Kurti',
      category: 'women',
      categoryLabel: 'Women',
      price: 2199,
      description: 'Cotton blend with delicate embroidery. Three-quarter sleeves, side slits, and a flattering A-line cut.',
      image: 'assets/vecteezy_formal-men-s-sky-blue-check-shirt-on-white-background_28629202.JPG',
      available: true
    },
    {
      id: 'couple-combo-pack',
      name: 'Couple Combo Pack',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 5499,
      description: 'His and hers tees, matching streetwear set. Designed to be worn together.',
      image: 'assets/vecteezy_a-photograph-of-a-middle-aged-man-with-a-bald-head-and-a_59373353.jpg',
      available: true
    },
    {
      id: 'embroidered-woolen-cap',
      name: 'Embroidered Woolen Cap',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 999,
      description: 'Warm fleece lining with embroidered detailing. One size fits most.',
      image: 'assets/images.jfif',
      available: true
    },
    {
      id: 'canvas-tote-bag',
      name: 'Canvas Tote Bag',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 799,
      description: 'Heavy-duty cotton canvas with inner pocket. Perfect for daily carry.',
      image: 'assets/1_3acd418c-1e90-4ec9-a0a7-a9937719046c_2048x2048.jpg',
      available: true
    },
    {
      id: 'stainless-steel-wristwatch',
      name: 'Stainless Steel Wristwatch',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 4499,
      description: 'Minimalist dial, leather strap, water resistant. A timeless everyday piece.',
      image: 'assets/vecteezy_formal-men-s-sky-blue-check-shirt-on-white-background_28629202.JPG',
      available: true
    },
    {
      id: 'casual-chino-pants',
      name: 'Casual Chino Pants',
      category: 'men',
      categoryLabel: 'Men',
      price: 2499,
      description: 'Soft twill, slim straight, four-pocket styling. Versatile for office or weekend.',
      image: 'assets/vecteezy_a-photograph-of-a-middle-aged-man-with-a-bald-head-and-a_59373353.jpg',
      available: true
    }
  ]
};

// In the browser this file is a plain <script>, so EVORA_CATALOG becomes a
// global. The server loads it with require(), so export it there too.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVORA_CATALOG;
}

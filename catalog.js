// ============================================================================
// catalog.js — bundled seed catalogue, not live storefront data.
// ----------------------------------------------------------------------------
// The browser loads this shape for compatibility, but api-client.js replaces
// window.EVORA_CATALOG with the fresh /api/menu response. Storefront consumers
// must await EVORA_API.catalogReady (product detail also awaits cartReady).
// Product edits belong in the database via the admin, not in this seed file.
// The server validates submitted IDs, quantities and displayed prices against
// current products and returns authoritative order totals.
//
// Shape of each item:
//   id            unique slug, used in product.html?slug=... and the cart
//   name          display name (cart keys use the stable id)
//   category      one of the ids in `categories` below
//   categoryLabel human-readable category name
//   price         integer rupees
//   description   shown on the product page
//   image         path relative to the site root
//   hoverImage    optional second photo shown when a product card is hovered;
//                 falls back to a zoomed crop of `image` when omitted
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
      id: 'olive-drape-coord-set',
      name: 'Olive Drape Co-Ord Set',
      category: 'women',
      categoryLabel: 'Women',
      price: 4299,
      description: 'A two-piece set in soft olive with a relaxed, fluid drape. Loose falling top and matching wide-leg trousers — an effortless head-to-toe look.',
      image: 'assets/products/olive-drape-coord-set.jpg',
      available: true
    },
    {
      id: 'mauve-embroidered-wrap-tunic',
      name: 'Mauve Embroidered Wrap Tunic',
      category: 'women',
      categoryLabel: 'Women',
      price: 2699,
      description: 'A wrap-front tunic in muted mauve with delicate embroidered trim along the edges. Falls loose and light for everyday wear.',
      image: 'assets/products/mauve-embroidered-wrap-tunic.jpg',
      available: true
    },
    {
      id: 'plum-square-neck-blouse',
      name: 'Plum Square-Neck Embroidered Blouse',
      category: 'women',
      categoryLabel: 'Women',
      price: 2499,
      description: 'Deep plum blouse with a clean square neckline, balloon sleeves and tonal embroidery across the chest. Dressy without trying too hard.',
      image: 'assets/products/plum-square-neck-blouse.jpg',
      available: true
    },
    {
      id: 'beige-floral-applique-shirt',
      name: 'Beige Floral Appliqué Camp Shirt',
      category: 'men',
      categoryLabel: 'Men',
      price: 2899,
      description: 'Soft beige camp-collar shirt finished with brown floral appliqué across the front. Relaxed fit, easy over a tee or on its own.',
      image: 'assets/products/beige-floral-applique-shirt.jpg',
      available: true
    },
    {
      id: 'red-parrot-resort-shirt',
      name: 'Red Parrot Embroidered Resort Shirt',
      category: 'men',
      categoryLabel: 'Men',
      price: 2899,
      description: 'Bright red resort shirt with parrot and palm embroidery. Open camp collar and a breezy cut made for warm days.',
      image: 'assets/products/red-parrot-resort-shirt.jpg',
      available: true
    },
    {
      id: 'brown-stripe-shirt-trouser-set',
      name: 'Brown Stripe Shirt & Trouser Set',
      category: 'men',
      categoryLabel: 'Men',
      price: 4499,
      description: 'Brown-and-white striped shirt paired with matching wide-leg trousers, styled with a knit tie. A complete outfit in one order.',
      image: 'assets/products/brown-stripe-shirt-trouser-set.jpg',
      available: true
    },
    {
      id: 'rust-tribal-print-shirt',
      name: 'Rust Tribal Print Shirt',
      category: 'men',
      categoryLabel: 'Men',
      price: 2799,
      description: 'Rust-toned shirt printed with bold black tribal motifs. A statement piece that keeps the rest of the outfit simple.',
      image: 'assets/products/rust-tribal-print-shirt.jpg',
      available: true
    },
    {
      id: 'red-diagonal-stripe-shirt',
      name: 'Red Diagonal-Stripe Oversized Shirt',
      category: 'men',
      categoryLabel: 'Men',
      price: 2699,
      description: 'Oversized shirt in red-and-white diagonal stripes. Dropped shoulders and a boxy cut for an easy streetwear fit.',
      image: 'assets/products/red-diagonal-stripe-shirt.jpg',
      available: true
    },
    {
      id: 'green-panda-embroidered-shirt',
      name: 'Green Panda Embroidered Shirt',
      category: 'men',
      categoryLabel: 'Men',
      price: 2899,
      description: 'Dark green shirt with playful panda-and-bamboo embroidery. A subtle shine in the fabric keeps it looking sharp.',
      image: 'assets/products/green-panda-embroidered-shirt.jpg',
      available: true
    },
    {
      id: 'cream-floral-hem-pullover',
      name: 'Cream Floral-Embroidered Pullover',
      category: 'men',
      categoryLabel: 'Men',
      price: 2999,
      description: 'Cream long-sleeve pullover with floral embroidery along the hem. Soft, warm and quietly detailed.',
      image: 'assets/products/cream-floral-hem-pullover.jpg',
      available: true
    },
    {
      id: 'cream-linen-embroidered-kurta',
      name: 'Cream Linen Embroidered Kurta',
      category: 'men',
      categoryLabel: 'Men',
      price: 2599,
      description: 'Breathable cream linen kurta with a henley neck and red embroidery at the collar. Classic cut, modern finish.',
      image: 'assets/products/cream-linen-embroidered-kurta.jpg',
      available: true
    },
    {
      id: 'grey-raglan-star-tee',
      name: 'Grey Raglan Star Tee',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 1999,
      description: 'Heather grey tee with contrast charcoal raglan sleeves and a star print. Soft cotton, everyday fit.',
      image: 'assets/products/grey-raglan-star-tee.jpg',
      available: true
    },
    {
      id: 'grey-graphic-knit-sweater',
      name: 'Grey Graphic Knit Sweater',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 3199,
      description: 'Chunky grey knit with abstract black lettering across the chest. Heavyweight yarn for real winter warmth.',
      image: 'assets/products/grey-graphic-knit-sweater.jpg',
      available: true
    },
    {
      id: 'brown-pink-stripe-tee',
      name: 'Brown & Pink Stripe Long-Sleeve Tee',
      category: 'women',
      categoryLabel: 'Women',
      price: 2199,
      description: 'Slim long-sleeve tee in brown-and-pink horizontal stripes. An easy layering piece that works tucked or loose.',
      image: 'assets/products/brown-pink-stripe-tee.jpg',
      available: true
    },
    {
      id: 'purple-embroidered-wrap-blouse',
      name: 'Purple Embroidered Wrap Blouse',
      category: 'women',
      categoryLabel: 'Women',
      price: 2499,
      description: 'Rich purple wrap blouse with embroidered trim at the neckline and sleeves. A flattering cross-front drape.',
      image: 'assets/products/purple-embroidered-wrap-blouse.jpg',
      available: true
    },
    {
      id: 'maroon-v-neck-top',
      name: 'Maroon V-Neck Long-Sleeve Top',
      category: 'women',
      categoryLabel: 'Women',
      price: 2299,
      description: 'Deep maroon top with a clean V-neck and fitted long sleeves. A simple base layer in a colour that carries the outfit.',
      image: 'assets/products/maroon-v-neck-top.jpg',
      available: true
    },
    {
      id: 'maroon-stripe-rugby-polo',
      name: 'Maroon Stripe Rugby Polo',
      category: 'men',
      categoryLabel: 'Men',
      price: 2799,
      description: 'Classic rugby polo in maroon stripes with a contrast white collar. Heavyweight cotton that holds its shape.',
      image: 'assets/products/maroon-stripe-rugby-polo.jpg',
      available: true
    },
    {
      id: 'green-stripe-rugby-polo',
      name: 'Green Stripe Rugby Polo',
      category: 'men',
      categoryLabel: 'Men',
      price: 2799,
      description: 'Rugby polo in green-and-brown stripes with a crisp white collar. Vintage sports feel, everyday comfort.',
      image: 'assets/products/green-stripe-rugby-polo.jpg',
      available: true
    },
    {
      id: 'grey-gothic-print-sweatpants',
      name: 'Grey Gothic-Print Sweatpants',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 2599,
      description: 'Grey sweatpants with a black gothic print down the leg. Soft fleece inside, relaxed fit, elastic cuffs.',
      image: 'assets/products/grey-gothic-print-sweatpants.jpg',
      available: true
    },
    {
      id: 'black-layered-knit-set',
      name: 'Black Layered Knit & Wide-Leg Set',
      category: 'men',
      categoryLabel: 'Men',
      price: 4999,
      description: 'A layered look: black knit over a sharp shirt with a red tie, finished with wide-leg trousers. The full outfit in one order.',
      image: 'assets/products/black-layered-knit-set.jpg',
      available: true
    },
    {
      id: 'brown-wide-leg-sweatpants',
      name: 'Brown Wide-Leg Drawstring Sweatpants',
      category: 'unisex',
      categoryLabel: 'Unisex',
      price: 2499,
      description: 'Chocolate brown sweatpants with a wide leg and a drawstring waist. Heavy, soft fleece that drapes instead of clinging.',
      image: 'assets/products/brown-wide-leg-sweatpants.jpg',
      hoverImage: 'assets/products/brown-wide-leg-sweatpants-model.jpg',
      available: true
    }
  ]
};

// In the browser this file is a plain <script>, so EVORA_CATALOG becomes a
// global. The server loads it with require(), so export it there too.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EVORA_CATALOG;
}

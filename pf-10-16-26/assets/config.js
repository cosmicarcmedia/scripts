/*
 * PRICES ARE PROVISIONAL, CONFIRM WITH COURT BEFORE PUBLISHING.
 *
 * This is the one file to edit for the offer. Every price, tier, date and the
 * support email on every page is read from here (the static HTML carries the same
 * defaults so the page still reads correctly if scripts are blocked).
 *
 * RESERVED_COUNT can also be set in assets/reservations.json ({"reserved": 12}).
 * If that file exists and holds a number, it wins, so updating the counter is a
 * one-number edit and a redeploy.
 */
window.PF_CONFIG = {
  // Stripe Payment Link for the $49 deposit. While it is a placeholder (starts with
  // "#"), the Reserve buttons open the "reservations open soon" notice with the
  // email form instead of sending anyone to a dead link.
  STRIPE_PAYMENT_LINK: "#reserve-coming-soon",

  DEPOSIT: 49,

  // Cumulative caps: Founding 25 is reservations 1 to 25, Founding 100 is 26 to 100,
  // Founding 200 is 101 to 200. price is the total founder price, deposit included.
  TIERS: [
    { name: "Founding 25",  cap: 25,  price: 299 },
    { name: "Founding 100", cap: 100, price: 349 },
    { name: "Founding 200", cap: 200, price: 379 }
  ],

  RETAIL_ESTIMATE: 399,

  // Paid reservations claimed so far. Only ever put the real number here.
  RESERVED_COUNT: 0,

  // Empty means forms post as Netlify Forms (data-netlify="true" with a honeypot).
  // On Cloudflare Pages or any other host, put a Formspree or similar endpoint here
  // and the forms will POST there with fetch instead.
  FORM_ENDPOINT: "",
  // Hosted design demo: forms skip sending and go straight to the thanks page.
  DEMO_MODE: true,

  SUPPORT_EMAIL: "hello@powerflag.example",

  // ISO date. The notice says "Reservations open Nov 11" from this.
  DEPOSITS_OPEN: "2026-11-11",

  // Analytics. Leave empty to load nothing. See assets/js/analytics.js.
  GA4_ID: "",
  META_PIXEL_ID: "",

  // Hero video at the top of the home page. An mp4 path, for example
  // "assets/video/hero.mp4". Empty shows HERO_POSTER as a still. The video plays
  // muted and looped, with a small sound toggle.
  HERO_VIDEO: "",
  HERO_POSTER: "assets/img/v2/hero-poster.jpg",

  // Dawn / Dusk demo on the home page. Stills come from ONE locked camera so the
  // four states line up. The two videos are optional: when empty, the stage
  // crossfades between the stills. New renders go in here and nowhere else.
  DEMO: {
    DAWN_STOWED:  "assets/img/v2/demo-dawn-stowed.jpg",
    DAWN_FLYING:  "assets/img/v2/demo-dawn-flying.jpg",
    DUSK_FLYING:  "assets/img/v2/demo-dusk-flying.jpg",
    NIGHT_STOWED: "assets/img/v2/demo-night-stowed.jpg",
    DEPLOY_VIDEO: "",   // dawn: stowed to flying
    STOW_VIDEO: "",     // dusk: flying to stowed
    // Where the product sits in the frame, as % x,y of the 16:9 picture. All four
    // stills share one locked camera, so both states land on the housing.
    HOTSPOT: { stowed: [22.5, 45.1], flying: [22.5, 45.1] },
    // Center of the crop on a narrow stage. The flag flies to the right of the
    // housing in this frame, so the center sits just right of the housing and
    // keeps the housing and the whole flag in frame on phones.
    FOCUS: [39, 45]
  }
};

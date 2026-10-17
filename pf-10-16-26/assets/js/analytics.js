/*
 * Analytics stub. Nothing loads until an ID is set in assets/config.js.
 *
 * To turn on GA4: put the measurement ID in GA4_ID. To turn on the Meta Pixel: put the
 * pixel ID in META_PIXEL_ID. Do both through the consent approach your counsel prefers,
 * and mention them in privacy.html (it already says analytics may be added).
 *
 * The reference snippets, left here commented so they can be pasted into <head> instead
 * if you prefer the vendor's own code:
 *
 * <!-- GA4
 * <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
 * <script>
 *   window.dataLayer = window.dataLayer || [];
 *   function gtag(){dataLayer.push(arguments);}
 *   gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX');
 * </script>
 * -->
 *
 * <!-- Meta Pixel
 * <script>
 *   !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
 *   n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
 *   n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
 *   t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
 *   document,'script','https://connect.facebook.net/en_US/fbevents.js');
 *   fbq('init', 'XXXXXXXXXXXXXXX'); fbq('track', 'PageView');
 * </script>
 * -->
 *
 * Events fired by the site:
 *   reserve_click  (any Reserve button)      GA4 event, Meta InitiateCheckout
 *   signup         (launch list or business form submitted)   GA4 generate_lead, Meta Lead
 */
(function () {
  var C = window.PF_CONFIG || {};

  function load(src) {
    var s = document.createElement("script");
    s.async = true; s.src = src; document.head.appendChild(s);
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  if (C.GA4_ID) {
    load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.GA4_ID));
    window.gtag("js", new Date());
    window.gtag("config", C.GA4_ID);
  }

  if (C.META_PIXEL_ID) {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", C.META_PIXEL_ID);
    window.fbq("track", "PageView");
  }

  window.pfTrack = function (name, params) {
    try {
      params = params || {};
      if (C.GA4_ID && window.gtag) {
        window.gtag("event", name === "signup" ? "generate_lead" : name, params);
      }
      if (C.META_PIXEL_ID && window.fbq) {
        window.fbq("track", name === "signup" ? "Lead" : (name === "reserve_click" ? "InitiateCheckout" : "CustomEvent"), params);
      }
    } catch (e) { /* analytics never breaks the page */ }
  };
})();

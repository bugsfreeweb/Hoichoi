/**
 * The bundled Bangla type library.
 *
 * Generated from the root `Bangla Fonts` zips; only Unicode faces whose cmap
 * actually contains Bengali are included. `fonts.css` declares the matching
 * @font-face rules, and every surface imports that stylesheet once.
 */
export interface BanglaFontFace {
  file: string;
  weight: number;
  style: "normal" | "italic";
}

export interface BanglaFontFamily {
  /** Stable slug used in settings and CSS class names. */
  id: string;
  /** Human label in the admin picker. */
  label: string;
  /** CSS `font-family` value declared by fonts.css. */
  family: string;
  /** The kind of document shipped with the family. */
  license: "web-with-attribution" | "prohibited" | "unverified";
  licenseNote: string;
  faces: BanglaFontFace[];
}

export const BANGLA_FONTS: readonly BanglaFontFamily[] = [
  {
    "id": "ban-mahfuz-maruf",
    "label": "BAN Mahfuz Maruf",
    "family": "BAN Mahfuz Maruf",
    "faces": [
      {
        "file": "ban-mahfuz-maruf-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "ban-mahfuz-maruf-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "bl-masud-mosaic",
    "label": "BL Masud Mosaic",
    "family": "BL Masud Mosaic",
    "faces": [
      {
        "file": "bl-masud-mosaic-900.woff2",
        "weight": 900,
        "style": "normal"
      },
      {
        "file": "bl-masud-mosaic-900-italic.woff2",
        "weight": 900,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "terms do not clearly grant webfont use"
  },
  {
    "id": "dhaleshwari",
    "label": "Dhaleshwari",
    "family": "Dhaleshwari",
    "faces": [
      {
        "file": "dhaleshwari-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "dhaleshwari-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-abdullah-momenshahi-am",
    "label": "FN Abdullah Momenshahi AM",
    "family": "FN Abdullah Momenshahi AM",
    "faces": [
      {
        "file": "fn-abdullah-momenshahi-am-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-abdullah-momenshahi-am-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-abdullah-momenshahi-pm",
    "label": "FN Abdullah Momenshahi PM",
    "family": "FN Abdullah Momenshahi PM",
    "faces": [
      {
        "file": "fn-abdullah-momenshahi-pm-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-abdullah-momenshahi-pm-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-badhon-bhasha-17",
    "label": "FN Badhon Bhasha-17",
    "family": "FN Badhon Bhasha-17",
    "faces": [
      {
        "file": "fn-badhon-bhasha-17-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-badhon-bhasha-17-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-badhon-ikra",
    "label": "FN Badhon Ikra",
    "family": "FN Badhon Ikra",
    "faces": [
      {
        "file": "fn-badhon-ikra-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-badhon-ikra-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-dukkho-bilashi",
    "label": "FN Dukkho Bilashi",
    "family": "FN Dukkho Bilashi",
    "faces": [
      {
        "file": "fn-dukkho-bilashi-300.woff2",
        "weight": 300,
        "style": "normal"
      },
      {
        "file": "fn-dukkho-bilashi-300-italic.woff2",
        "weight": 300,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-faruq-noakhali",
    "label": "FN Faruq Noakhali",
    "family": "FN Faruq Noakhali",
    "faces": [
      {
        "file": "fn-faruq-noakhali-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-faruq-noakhali-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-helal-arafat",
    "label": "FN Helal Arafat",
    "family": "FN Helal Arafat",
    "faces": [
      {
        "file": "fn-helal-arafat-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-helal-arafat-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-helal-laveriya",
    "label": "FN Helal Laveriya",
    "family": "FN Helal Laveriya",
    "faces": [
      {
        "file": "fn-helal-laveriya-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-helal-laveriya-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-kothakoli",
    "label": "FN Kothakoli",
    "family": "FN Kothakoli",
    "faces": [
      {
        "file": "fn-kothakoli-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-kothakoli-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-lipika-azhari",
    "label": "FN Lipika Azhari",
    "family": "FN Lipika Azhari",
    "faces": [
      {
        "file": "fn-lipika-azhari-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-lipika-azhari-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      },
      {
        "file": "fn-lipika-azhari-500.woff2",
        "weight": 500,
        "style": "normal"
      },
      {
        "file": "fn-lipika-azhari-500-italic.woff2",
        "weight": 500,
        "style": "italic"
      },
      {
        "file": "fn-lipika-azhari-700.woff2",
        "weight": 700,
        "style": "normal"
      },
      {
        "file": "fn-lipika-azhari-800-italic.woff2",
        "weight": 800,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-mahbub-samira",
    "label": "FN Mahbub Samira",
    "family": "FN Mahbub Samira",
    "faces": [
      {
        "file": "fn-mahbub-samira-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahbub-samira-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahfuj-headline",
    "label": "FN Mahfuj Headline",
    "family": "FN Mahfuj Headline",
    "faces": [
      {
        "file": "fn-mahfuj-headline-100.woff2",
        "weight": 100,
        "style": "normal"
      },
      {
        "file": "fn-mahfuj-headline-300.woff2",
        "weight": 300,
        "style": "normal"
      },
      {
        "file": "fn-mahfuj-headline-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahfuj-headline-500.woff2",
        "weight": 500,
        "style": "normal"
      },
      {
        "file": "fn-mahfuj-headline-600.woff2",
        "weight": 600,
        "style": "normal"
      },
      {
        "file": "fn-mahfuj-headline-700.woff2",
        "weight": 700,
        "style": "normal"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahfuz-metro",
    "label": "FN Mahfuz Metro",
    "family": "FN Mahfuz Metro",
    "faces": [
      {
        "file": "fn-mahfuz-metro-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahfuz-metro-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahin-aklima",
    "label": "FN Mahin Aklima",
    "family": "FN Mahin Aklima",
    "faces": [
      {
        "file": "fn-mahin-aklima-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahin-aklima-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-mahin-jubayer",
    "label": "FN Mahin Jubayer",
    "family": "FN Mahin Jubayer",
    "faces": [
      {
        "file": "fn-mahin-jubayer-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahin-jubayer-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahin-sayeedi",
    "label": "FN Mahin Sayeedi",
    "family": "FN Mahin Sayeedi",
    "faces": [
      {
        "file": "fn-mahin-sayeedi-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahin-sayeedi-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahin-shorif",
    "label": "FN Mahin Shorif",
    "family": "FN Mahin Shorif",
    "faces": [
      {
        "file": "fn-mahin-shorif-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahin-shorif-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mahin-shukran-lipi",
    "label": "FN Mahin Shukran Lipi",
    "family": "FN Mahin Shukran Lipi",
    "faces": [
      {
        "file": "fn-mahin-shukran-lipi-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mahin-shukran-lipi-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-mamun-bornolipi",
    "label": "FN Mamun Bornolipi",
    "family": "FN Mamun Bornolipi",
    "faces": [
      {
        "file": "fn-mamun-bornolipi-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-mamun-bornolipi-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-mamun-mahfuz",
    "label": "FN Mamun Mahfuz",
    "family": "FN Mamun Mahfuz",
    "faces": [
      {
        "file": "fn-mamun-mahfuz-700.woff2",
        "weight": 700,
        "style": "normal"
      },
      {
        "file": "fn-mamun-mahfuz-700-italic.woff2",
        "weight": 700,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "fn-nuralam-sheikh-mujib",
    "label": "FN Nuralam Sheikh Mujib",
    "family": "FN Nuralam Sheikh Mujib",
    "faces": [
      {
        "file": "fn-nuralam-sheikh-mujib-300.woff2",
        "weight": 300,
        "style": "normal"
      },
      {
        "file": "fn-nuralam-sheikh-mujib-300-italic.woff2",
        "weight": 300,
        "style": "italic"
      },
      {
        "file": "fn-nuralam-sheikh-mujib-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-nuralam-sheikh-mujib-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      },
      {
        "file": "fn-nuralam-sheikh-mujib-700.woff2",
        "weight": 700,
        "style": "normal"
      },
      {
        "file": "fn-nuralam-sheikh-mujib-700-italic.woff2",
        "weight": 700,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-sabina-shorolipi-bangla",
    "label": "FN Sabina Shorolipi Bangla",
    "family": "FN Sabina Shorolipi Bangla",
    "faces": [
      {
        "file": "fn-sabina-shorolipi-bangla-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-sabina-shorolipi-bangla-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "fn-samprotik",
    "label": "FN Samprotik",
    "family": "FN Samprotik",
    "faces": [
      {
        "file": "fn-samprotik-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "fn-samprotik-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "kopotakkho",
    "label": "Kopotakkho",
    "family": "Kopotakkho",
    "faces": [
      {
        "file": "kopotakkho-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "kopotakkho-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  },
  {
    "id": "li-abu-j-m-akkas",
    "label": "Li Abu J M Akkas",
    "family": "Li Abu J M Akkas",
    "faces": [
      {
        "file": "li-abu-j-m-akkas-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-abu-j-m-akkas-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-atithi",
    "label": "Li Alinur Atithi",
    "family": "Li Alinur Atithi",
    "faces": [
      {
        "file": "li-alinur-atithi-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-atithi-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-binoy",
    "label": "Li Alinur Binoy",
    "family": "Li Alinur Binoy",
    "faces": [
      {
        "file": "li-alinur-binoy-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-binoy-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-bornobikash",
    "label": "Li Alinur BornoBikash",
    "family": "Li Alinur BornoBikash",
    "faces": [
      {
        "file": "li-alinur-bornobikash-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-bornobikash-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-imarat",
    "label": "Li Alinur Imarat",
    "family": "Li Alinur Imarat",
    "faces": [
      {
        "file": "li-alinur-imarat-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-imarat-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-prohor",
    "label": "Li Alinur Prohor",
    "family": "Li Alinur Prohor",
    "faces": [
      {
        "file": "li-alinur-prohor-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-prohor-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-rangpur",
    "label": "Li Alinur Rangpur",
    "family": "Li Alinur Rangpur",
    "faces": [
      {
        "file": "li-alinur-rangpur-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-rangpur-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-alinur-tumatul",
    "label": "Li Alinur Tumatul",
    "family": "Li Alinur Tumatul",
    "faces": [
      {
        "file": "li-alinur-tumatul-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-alinur-tumatul-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-chayana-teesta",
    "label": "Li Chayana Teesta",
    "family": "Li Chayana Teesta",
    "faces": [
      {
        "file": "li-chayana-teesta-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-chayana-teesta-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-chhatrish-july",
    "label": "Li Chhatrish July",
    "family": "Li Chhatrish July",
    "faces": [
      {
        "file": "li-chhatrish-july-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-chhatrish-july-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-mahfuz-himadri",
    "label": "Li Mahfuz Himadri",
    "family": "Li Mahfuz Himadri",
    "faces": [
      {
        "file": "li-mahfuz-himadri-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-mahfuz-himadri-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-manowar-murshidabad",
    "label": "Li Manowar Murshidabad",
    "family": "Li Manowar Murshidabad",
    "faces": [
      {
        "file": "li-manowar-murshidabad-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-manowar-murshidabad-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-manowar-nihar",
    "label": "Li Manowar Nihar",
    "family": "Li Manowar Nihar",
    "faces": [
      {
        "file": "li-manowar-nihar-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-manowar-nihar-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-sabbir-ashalota-1",
    "label": "Li Sabbir Ashalota 1",
    "family": "Li Sabbir Ashalota 1",
    "faces": [
      {
        "file": "li-sabbir-ashalota-1-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-sabbir-ashalota-1-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-sabbir-ashalota-2",
    "label": "Li Sabbir Ashalota 2",
    "family": "Li Sabbir Ashalota 2",
    "faces": [
      {
        "file": "li-sabbir-ashalota-2-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-sabbir-ashalota-2-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-sabbir-ashalota-3",
    "label": "Li Sabbir Ashalota 3",
    "family": "Li Sabbir Ashalota 3",
    "faces": [
      {
        "file": "li-sabbir-ashalota-3-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-sabbir-ashalota-3-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-sabbir-sorolota",
    "label": "Li Sabbir Sorolota",
    "family": "Li Sabbir Sorolota",
    "faces": [
      {
        "file": "li-sabbir-sorolota-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-sabbir-sorolota-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "li-sweet-shreyam",
    "label": "Li Sweet Shreyam",
    "family": "Li Sweet Shreyam",
    "faces": [
      {
        "file": "li-sweet-shreyam-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "li-sweet-shreyam-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "web-with-attribution",
    "licenseNote": "webfont allowed with permission and a footer backlink"
  },
  {
    "id": "padmapata",
    "label": "PadmaPata",
    "family": "PadmaPata",
    "faces": [
      {
        "file": "padmapata-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "padmapata-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "prohibited",
    "licenseNote": "terms forbid webfont use"
  },
  {
    "id": "samsur-dhansiri",
    "label": "Samsur Dhansiri",
    "family": "Samsur Dhansiri",
    "faces": [
      {
        "file": "samsur-dhansiri-400.woff2",
        "weight": 400,
        "style": "normal"
      },
      {
        "file": "samsur-dhansiri-400-italic.woff2",
        "weight": 400,
        "style": "italic"
      }
    ],
    "license": "unverified",
    "licenseNote": "no licence document shipped"
  }
] as const;

export const BANGLA_FONT_IDS = BANGLA_FONTS.map((f) => f.id);

export function banglaFontById(id: string | null | undefined): BanglaFontFamily | null {
  if (!id) return null;
  return BANGLA_FONTS.find((f) => f.id === id) ?? null;
}

/** A safe stack: the chosen family, then the shipped defaults, then serif. */
export function banglaFontStack(
  id: string | null | undefined,
  fallback = "Noto Serif Bengali",
  generic: "serif" | "sans-serif" = "serif",
): string {
  const font = banglaFontById(id);
  const chosen = font ? `'${font.family}'` : "";
  return [chosen, `'${fallback}'`, generic].filter(Boolean).join(", ");
}

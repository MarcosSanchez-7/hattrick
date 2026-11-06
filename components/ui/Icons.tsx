export type IconProps = { className?: string };

const base = (className?: string) => `icon${className ? ` ${className}` : ""}`;

export const IconSearch = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
);

export const IconBag = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16l-1.2 13H5.2L4 7Z" />
    <path d="M9 10V6a3 3 0 0 1 6 0v4" />
  </svg>
);

export const IconUser = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="8.5" r="3.75" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const IconHeart = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.27 2 8.5 2 5.41 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.08C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.41 22 8.5c0 3.77-3.4 6.86-8.55 11.53z" />
  </svg>
);

export const IconClose = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconMenu = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconArrow = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconChevron = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconPlus = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h14" />
  </svg>
);

export const IconTrash = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" />
  </svg>
);

export const IconStar = ({ className }: IconProps) => (
  <svg
    className={base(className)}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ fill: "currentColor", stroke: "none" }}
  >
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8L12 3.5Z" />
  </svg>
);

export const IconTruck = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 7h11v9H2zM13 10h4.5l2.5 3v3h-7z" />
    <circle cx="6.5" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export const IconReturn = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 10a8 8 0 1 1 1.6 5" />
    <path d="M3 5v5h5" />
  </svg>
);

export const IconShield = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6l7-2.5Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconPrint = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4h10v5H7zM5 9h14v7H5zM7 14h10v6H7z" />
  </svg>
);

export const IconCheck = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const IconInstagram = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="0.9" style={{ fill: "currentColor" }} />
  </svg>
);

export const IconWhatsapp = ({ className }: IconProps) => (
  <svg
    className={base(className)}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ fill: "currentColor", stroke: "none" }}
  >
    <path d="M12 2.5a9.5 9.5 0 0 0-8.2 14.3L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm0 1.7a7.8 7.8 0 0 1 6.6 12 7.8 7.8 0 0 1-11.8 2.3l-.3-.2-2.8.8.8-2.7-.2-.3A7.8 7.8 0 0 1 12 4.2Z" />
    <path d="M9.1 7.6c-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.4-.2.3-.9.9-.9 2.1s.9 2.4 1.1 2.6c.1.2 1.8 2.9 4.5 4 2.2.9 2.7.7 3.1.7.5-.1 1.6-.6 1.8-1.3.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3-.2-.1-1.6-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.6.9-.8 1-.1.2-.3.2-.5.1-.3-.1-1.1-.4-2.1-1.3-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.5l.4-.5c.1-.1.2-.2.2-.4.1-.1 0-.3 0-.4 0-.1-.6-1.5-.8-2Z" />
  </svg>
);

/** Logo de WhatsApp a color completo (círculo verde + auricular blanco) --
 * a diferencia de IconWhatsapp (un solo color, currentColor), este lleva
 * sus propios colores fijos, no se adapta al texto. Se usa donde el ícono
 * va suelto sobre un fondo que no es ya verde (ej. el botón "Continuar por
 * WhatsApp" del carrito, que es negro) -- en el botón flotante verde
 * (WhatsAppButton.tsx) se sigue usando IconWhatsapp a propósito, para no
 * terminar con un círculo verde adentro de otro círculo verde. */
export const IconWhatsappBadge = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 512 512" aria-hidden="true" style={{ stroke: "none" }}>
    <path
      fill="#b3b3b3"
      d="m143.8 431.2l7.7 4.5c32.2 19.1 69.2 29.2 106.8 29.2h.1c115.7 0 209.8-94.1 209.9-209.8c0-56.1-21.8-108.8-61.4-148.4c-39.3-39.5-92.7-61.7-148.4-61.5c-115.8 0-209.9 94.1-210 209.8c-.1 39.5 11.1 78.2 32.1 111.7l5 7.9L64.4 452zM3.7 512l35.8-130.8C17.5 342.9 5.8 299.5 5.9 255C5.9 115.8 119.2 2.6 258.4 2.6c67.5 0 130.9 26.3 178.6 74s73.9 111.1 73.9 178.6c-.1 139.2-113.3 252.4-252.5 252.4h-.1c-42.3 0-83.8-10.6-120.7-30.7z"
    />
    <path
      fill="#fff"
      d="M1.1 509.4L37 378.6C14.8 340.2 3.2 296.7 3.3 252.4C3.3 113.2 116.6 0 255.8 0c67.5 0 130.9 26.3 178.6 74s73.9 111.1 73.9 178.6C508.2 391.8 394.9 505 255.8 505h-.1c-42.3 0-83.8-10.6-120.7-30.7z"
    />
    <linearGradient
      id="hattrick-whatsapp-badge-gradient"
      x1="254.658"
      x2="256.786"
      y1="345.363"
      y2="704.074"
      gradientTransform="translate(0 -277.552)"
      gradientUnits="userSpaceOnUse"
    >
      <stop offset="0" stopColor="#57d163" />
      <stop offset="1" stopColor="#23b33a" />
    </linearGradient>
    <path
      fill="url(#hattrick-whatsapp-badge-gradient)"
      d="M255.8 42.6c-115.8 0-209.9 94.1-210 209.8c0 39.5 11.2 78.2 32.2 111.7l5 7.9l-21.2 77.4l79.4-20.8l7.7 4.5c32.2 19.1 69.2 29.2 106.8 29.2h.1c115.7 0 209.8-94.1 209.9-209.8c.2-55.7-21.9-109.1-61.4-148.4c-39.3-39.4-92.8-61.6-148.5-61.5"
    />
    <path
      fill="#fff"
      fillRule="evenodd"
      d="M192.7 146.9c-4.7-10.5-9.7-10.7-14.2-10.9l-12.1-.1c-4.2 0-11 1.6-16.8 7.9s-22.1 21.6-22.1 52.6s22.6 61 25.8 65.2s43.6 69.9 107.8 95.2c53.3 21 64.1 16.8 75.7 15.8c11.6-1.1 37.3-15.3 42.6-30s5.3-27.4 3.7-30s-5.8-4.2-12.1-7.4s-37.3-18.4-43.1-20.5s-10-3.2-14.2 3.2c-4.2 6.3-16.3 20.5-20 24.7s-7.4 4.7-13.7 1.6c-6.3-3.2-26.6-9.8-50.7-31.3c-18.8-16.7-31.4-37.4-35.1-43.7s-.4-9.7 2.8-12.9c2.8-2.8 6.3-7.4 9.5-11.1s4.2-6.3 6.3-10.5s1.1-7.9-.5-11.1c-1.8-3-14-34.2-19.6-46.7"
    />
  </svg>
);

/** Escudo real de la Premier League (vs. la corona genérica usada antes
 * para esta liga en CatalogIcons.tsx). */
export const IconPremierLeague = ({ className }: IconProps) => (
  <svg
    className={base(className)}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ stroke: "none" }}
  >
    <path
      fill="currentColor"
      d="M11.176 0s-.681 1.938-.867 2.527C9.844 2.202 8.386 1.194 7.78.775c.14.806.356 2.124.403 2.403c-.124-.093-.821-.698-1.875-1.194c.589.682 1.008 1.736 1.271 2.588a10.57 10.57 0 0 1 5.238-1.379c.977 0 1.94.14 2.854.403c.093-.884.279-1.968.682-2.758c-.915.728-1.474 1.503-1.551 1.596c-.031-.186-.093-1.52-.17-2.434c-.372.403-1.8 2.016-2.063 2.264C12.384 1.938 11.176 0 11.176 0m1.674 3.86c-1.674 0-3.3.386-4.696 1.115c.713.046 1.224.668 1.395 1.164c-.558-.45-1.442-.667-1.985-.078c-.511.589-.464 1.688.047 2.572c-1.193-.605-1.194-2.185-.775-2.867A10.4 10.4 0 0 0 3.61 9.594l1.07.172c-1.24 1.426-2.107 3.953-2.107 5.146l1.75-.543c-.31 1.054-.401 4.602.653 6.385c0 0 1.38-.96 2.945-3.363c.65 2.17.356 3.985 0 5.767c2.82 1.581 6.09.696 8.012-.683l.357 1.35c2.248-1.489 3.488-3.628 3.72-6.124l.837.93c1.286-3.829.28-6.883-1.565-9.502l-.078.637l-.79-.87s.17-.077.31-.263c.03-.078-.046-.495-.371-.774c-.31.078-.56.264-.684.45a3.2 3.2 0 0 0-.93-.543c.062.077.604.79.65 1.007c.466.388 1.102.837 1.52 1.395c-.34-.403-1.984-.497-2.728-.078c0 0-.744-.868-1.426-1.473c-.14-.511.326-.96.326-.96s-.48-.03-.93.42c-.682-.512-1.55-.745-1.55-.745c-.961.14-1.612.82-1.612.82c.217.14.512.327.776.42c.511.217 1.006.139 1.332.139c.263 0 .636.078.636.078s.635.495 1.565 1.565c-1.426-.574-2.915.062-3.969-.45c-1.24-.62-1.146-1.595-1.146-1.595s-.836-.11-.836-.141c0 0 .618-.82 1.548-1.1l-.464-.402c.558-.465 1.534-1.085 3.115-1.24c0 0 .683.262 2.11 1.285c.232-.326.308-1.008.308-1.008c.728.248 2.217 1.333 2.806 1.984c-.325-.759-.559-1.223-.636-2.013c-.357-.357-1.24-1.101-3.069-1.551c.295.605.264 1.115.264 1.115c-.34-.45-1.055-1.146-1.55-1.332c-.295-.015-.605-.047-.93-.047zm3.271 7.068a4.3 4.3 0 0 0 1.256.697v1.348c-.465.403-1.985 1.675-3.008 1.566c-.573-1.1-1.115-2.107-1.115-2.107s1.565-1.318 2.867-1.504m2.975.031c.465 1.131.59 2.48.078 3.379c-.28-.605-.636-.947-1.008-1.35v-1.347s.418-.264.93-.682m-.977 3.395c.465.511.559 1.068.559 1.068c-.202 1.131-.836 1.846-1.301 2.14c.046-.821-.172-1.519-.172-1.519c-.34.372-1.13.743-1.596.836l-.697-1.3c.822-.032 2.201-1.194 2.201-1.194z"
    />
  </svg>
);

/** Logo real de la Serie A (vs. el escudo genérico usado antes para esta
 * liga en CatalogIcons.tsx). */
export const IconSerieA = ({ className }: IconProps) => (
  <svg
    className={base(className)}
    viewBox="0 0 24 24"
    aria-hidden="true"
    style={{ stroke: "none" }}
  >
    <path
      fill="currentColor"
      d="M14.091 20.985H5.743V22h12.59v-1.015Zm-8.28.067h.116l-.116.166Zm0 .246l.018.013l.172-.242h.14l-.327.417Zm0 .3l.426-.544h.123l-.549.646Zm0 .336v-.127l.624-.736h.166l-.763.863Zm.212 0h-.1l.778-.88h.09Zm.09 0l.757-.863h.075l-.7.863Zm.233-.018l.7-.862h.094l-.649.857Zm.211.018l.655-.863h.137l-.664.863Zm.426 0h-.212l.677-.88h.158Zm.083 0l.611-.863h.155l-.6.863Zm.472 0h-.227l.616-.88h.119Zm.078 0l.5-.861l.1.011l-.436.85Zm.348 0h-.11l.451-.88h.066Zm.074 0l.408-.88h.184l-.425.88Zm.358 0h-.115l.424-.88h.136Zm.076 0l.445-.88h.116l-.411.88Zm.417 0h-.188l.411-.88h.178Zm.074 0l.4-.88h.108l-.333.88Zm.253-.019l.326-.861h.132l-.254.864Zm.269.019l.26-.88h.1l-.231.88Zm.432 0h-.049l.049-.151Zm0-.372l-.12.372h-.118l.231-.88h.007Zm4.174.372H9.985v-.88h4.106ZM11.99 16.58l.008.014v-.006l6.292-3.978h-.105h.1L13.734 2h-3.473L5.71 12.607Zm5.857-3.848l-5.47 3.458l1.5-2.676l.542-.885Zm-5.846-6.367l.951 2.581h-1.23l-.9 2.394h3.013l.423 1.151h-4.5Zm-2.428 6.264l.545.891l1.5 2.663l-5.462-3.454Zm8.772 7.771l-.871-2.507a.05.05 0 0 0-.05-.038h-.476a.05.05 0 0 0-.051.038l-.89 2.507q-.01.038.025.038h.5a.05.05 0 0 0 .05-.038l.144-.451h.9l.15.451a.05.05 0 0 0 .05.038h.495q.035-.006.024-.038m-1.473-.927l.3-.9h.013l.294.9Zm-2.977-1.139h1.106a.034.034 0 0 0 .038-.038v-.407a.034.034 0 0 0-.038-.038h-1.652a.033.033 0 0 0-.037.038V20.4a.032.032 0 0 0 .037.037h1.652a.033.033 0 0 0 .038-.037V20a.033.033 0 0 0-.038-.042h-1.106a.023.023 0 0 1-.025-.026V19.4a.023.023 0 0 1 .025-.025h.927a.033.033 0 0 0 .038-.038v-.4a.033.033 0 0 0-.038-.038h-.927a.023.023 0 0 1-.025-.025v-.514a.023.023 0 0 1 .025-.026m-1.517 2.1h.476a.034.034 0 0 0 .038-.038v-2.507a.034.034 0 0 0-.038-.038h-.483a.033.033 0 0 0-.037.038h.006V20.4a.034.034 0 0 0 .038.034m-.395-1.787a.8.8 0 0 0-.878-.8h-1.028a.034.034 0 0 0-.038.038v2.505a.034.034 0 0 0 .038.038h.483a.033.033 0 0 0 .037-.038v-.921a.024.024 0 0 1 .025-.026h.345l.445.947a.06.06 0 0 0 .057.038v-.007h.539c.025 0 .037-.018.025-.043l-.508-1.016a.75.75 0 0 0 .458-.715m-.9.333h-.458a.024.024 0 0 1-.025-.025v-.6a.023.023 0 0 1 .025-.025h.458a.315.315 0 0 1 .351.32a.324.324 0 0 1-.354.33Zm-2.529-.646H9.67a.033.033 0 0 0 .037-.038v-.407a.033.033 0 0 0-.037-.038H8.015a.034.034 0 0 0-.038.038V20.4a.033.033 0 0 0 .038.037h1.648a.033.033 0 0 0 .038-.037V20a.033.033 0 0 0-.038-.037H8.554a.023.023 0 0 1-.025-.026V19.4a.023.023 0 0 1 .025-.025h.927a.033.033 0 0 0 .038-.038v-.4a.033.033 0 0 0-.038-.037h-.927a.023.023 0 0 1-.025-.025v-.514a.023.023 0 0 1 .025-.027m-.878 1.329c0-.47-.282-.708-.815-.784l-.138-.018c-.294-.038-.4-.132-.4-.283s.119-.282.345-.282a1.04 1.04 0 0 1 .6.2a.034.034 0 0 0 .05-.013l.232-.345q.03-.038-.007-.056a1.46 1.46 0 0 0-.877-.27a.806.806 0 0 0-.915.79c0 .452.288.7.815.771l.137.019c.308.044.4.138.4.288c0 .182-.151.308-.42.308a1.08 1.08 0 0 1-.677-.264a.04.04 0 0 0-.057.007l-.288.332c-.019.019-.006.05.006.063a1.54 1.54 0 0 0 .991.357c.673-.005 1.018-.356 1.018-.82"
    />
  </svg>
);

export const IconX = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 4l16 16M20 4 4 20" />
  </svg>
);

export const IconTikTok = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
    <path d="M14 4c.6 2.4 2.2 3.8 4.5 4" />
  </svg>
);

export const IconYoutube = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="6" width="18" height="12" rx="3.5" />
    <path d="m11 10 4 2-4 2z" />
  </svg>
);

export const IconFolder = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 6.5a1.5 1.5 0 0 1 1.5-1.5h4.5l2 2.5h9a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-16A1.5 1.5 0 0 1 3.5 18Z" />
  </svg>
);

export const IconUpload = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 15V4M8 8l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const IconGrid = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" />
    <rect x="13.5" y="3.5" width="7" height="7" />
    <rect x="3.5" y="13.5" width="7" height="7" />
    <rect x="13.5" y="13.5" width="7" height="7" />
  </svg>
);

export const IconTag = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M11 3.5H5.5a2 2 0 0 0-2 2V11c0 .53.21 1.04.59 1.41l8.5 8.5a2 2 0 0 0 2.82 0l5.6-5.6a2 2 0 0 0 0-2.82l-8.5-8.5A2 2 0 0 0 11 3.5Z" />
    <circle cx="8" cy="8" r="1.4" style={{ fill: "currentColor", stroke: "none" }} />
  </svg>
);

export const IconLayout = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="1.5" />
    <path d="M3.5 9.5h17" />
  </svg>
);

export const IconExternal = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 6H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    <path d="M14 4h6v6M20 4 10 14" />
  </svg>
);

export const IconSettings = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M3 12h2.5M18.5 12H21M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </svg>
);

export const IconEye = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconEyeOff = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.7 15.7 0 0 1-3.4 4.2M6.7 6.7C4 8.5 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 3.3-.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
);

export const IconReceipt = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3h12v18l-2.5-1.5L13 21l-1-1.5L11 21l-2.5-1.5L6 21Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
);

export const IconBox = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" />
    <path d="M3.5 8v8.5L12 21l8.5-4.5V8M12 12.5V21" />
  </svg>
);

export const IconWallet = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
    <path d="M15.5 12.5h3.5v3h-3.5a1.5 1.5 0 0 1 0-3Z" />
  </svg>
);

export const IconDocument = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6.5 3.5h7l4 4v13h-11Z" />
    <path d="M13.5 3.5v4h4M9 12h6M9 15.5h6" />
  </svg>
);

export const IconExpand = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
  </svg>
);

export const IconGlobe = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.5 2.3 3.8 5.4 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.4-3.8-8.5s1.3-6.2 3.8-8.5Z" />
  </svg>
);

export const IconMapPin = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" />
    <circle cx="12" cy="9" r="2.3" />
  </svg>
);

export const IconTrophy = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
    <path d="M7 5.5H4v1.5a3.5 3.5 0 0 0 3.5 3.5M17 5.5h3v1.5a3.5 3.5 0 0 1-3.5 3.5" />
    <path d="M12 14v3M9 20.5h6M9.5 17.5h5l.5 3h-6Z" />
  </svg>
);

export const IconHourglass = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3.5h12M6 20.5h12" />
    <path d="M7 3.5v2.3c0 2 1.8 3.6 3.6 4.2 1.8-.6 3.6-2.2 3.6-4.2V3.5M7 20.5v-2.3c0-2 1.8-3.6 3.6-4.2 1.8.6 3.6 2.2 3.6 4.2v2.3" />
  </svg>
);

export const IconSun = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="4.5" />
    <path d="M12 2.5v2.5M12 19v2.5M4.6 4.6l1.8 1.8M17.6 17.6l1.8 1.8M2.5 12H5M19 12h2.5M4.6 19.4l1.8-1.8M17.6 6.4l1.8-1.8" />
  </svg>
);

export const IconDiamond = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5 21 12l-9 9.5-9-9.5Z" />
  </svg>
);

export const IconMedal = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M8 3.5h8l-2.6 6.4h-2.8Z" />
    <circle cx="12" cy="15" r="5.5" />
  </svg>
);

export const IconFlagStripes = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 3v18" />
    <path d="M5 4.5h14v3.5H5ZM5 11h14v3.5H5Z" />
  </svg>
);

export const IconHome = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v10h12V10" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

export const IconPalette = ({ className }: IconProps) => (
  <svg className={base(className)} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3.5c-4.7 0-8.5 3.6-8.5 8 0 3 2.2 4.5 4.3 4.5h1a1.6 1.6 0 0 1 1.6 1.6c0 .5-.2.9-.2 1.4 0 .9.8 1.5 1.8 1.5 4.7 0 8.5-3.8 8.5-8.5 0-4.7-3.8-8.5-8.5-8.5Z" />
    <circle cx="8" cy="10.5" r="1.1" style={{ fill: "currentColor", stroke: "none" }} />
    <circle cx="12" cy="8" r="1.1" style={{ fill: "currentColor", stroke: "none" }} />
    <circle cx="16" cy="10.5" r="1.1" style={{ fill: "currentColor", stroke: "none" }} />
  </svg>
);

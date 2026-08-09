type IconProps = { className?: string };

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
    <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" />
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

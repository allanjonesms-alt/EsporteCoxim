
export const APP_NAME = "ESPORTE COXIM";

export const DEFAULT_ADMIN = {
  phone: "67984373039",
  password: "@Jones2028"
};

// Logo em formato SVG (Vetor) para garantir carregamento e nitidez máxima
export const LOGO_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:%23003b95;stop-opacity:1" />
      <stop offset="100%" style="stop-color:%23002b6d;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Escudo Principal -->
  <path d="M200 20 L340 80 L340 220 C340 320 200 380 200 380 C200 380 60 320 60 220 L60 80 L200 20 Z" fill="url(%23grad1)" stroke="%23ffffff" stroke-width="8"/>
  <path d="M200 35 L325 90 L325 215 C325 300 200 355 200 355 C200 355 75 300 75 215 L75 90 L200 35 Z" fill="none" stroke="%23d90429" stroke-width="4"/>
  
  <!-- Estrela -->
  <polygon points="200,60 215,100 255,100 222,125 235,165 200,140 165,165 178,125 145,100 185,100" fill="white" />
  
  <!-- Texto Esporte -->
  <text x="200" y="230" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="52" fill="white" text-anchor="middle" style="text-transform: uppercase; letter-spacing: -2px;">ESPORTE</text>
  
  <!-- Faixa Vermelha para Coxim -->
  <rect x="80" y="245" width="240" height="60" rx="10" fill="%23d90429" transform="skewX(-5)" />
  <text x="200" y="290" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="58" fill="white" text-anchor="middle" style="text-transform: uppercase; letter-spacing: -1px;">COXIM</text>
  
  <!-- Ícone de Bola Simplificado -->
  <circle cx="310" cy="100" r="45" fill="white" stroke="%23002b6d" stroke-width="2" />
  <path d="M280 80 L340 120 M310 55 L310 145 M265 100 L355 100" stroke="%23002b6d" stroke-width="1" opacity="0.3" />
</svg>`;

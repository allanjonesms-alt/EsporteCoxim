
export const APP_NAME = "ESPORTE COXIM";

export const DEFAULT_ADMIN = {
  phone: "67984373039",
  password: "@Jones2028"
};

/**
 * LOGO ESPORTE COXIM - Versão SVG Vetorial
 * Baseado na imagem enviada pelo usuário.
 * Este código é imune a erros de carregamento de arquivos externos.
 */
export const LOGO_DATA_URL = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:%23003b95;stop-opacity:1" />
      <stop offset="100%" style="stop-color:%23001a4d;stop-opacity:1" />
    </linearGradient>
  </defs>
  <!-- Sombra projetada -->
  <path d="M250 45 L410 110 L410 260 C410 370 250 440 250 440 C250 440 90 370 90 260 L90 110 L250 45 Z" fill="black" opacity="0.2" transform="translate(5, 5)"/>
  <!-- Escudo Principal -->
  <path d="M250 40 L410 105 L410 255 C410 365 250 435 250 435 C250 435 90 365 90 255 L90 105 L250 40 Z" fill="url(%23shieldGrad)" stroke="white" stroke-width="10"/>
  <!-- Borda Interna Vermelha -->
  <path d="M250 60 L385 115 L385 250 C385 340 250 410 250 410 C250 410 115 340 115 250 L115 115 L250 60 Z" fill="none" stroke="%23d90429" stroke-width="5"/>
  
  <!-- Estrela Superior -->
  <polygon points="250,80 262,112 296,112 268,132 278,165 250,145 222,165 232,132 204,112 238,112" fill="white" />
  
  <!-- Círculo da Bola -->
  <circle cx="360" cy="130" r="50" fill="white" stroke="%23001a4d" stroke-width="2"/>
  <path d="M330 110 L390 150 M360 80 L360 180 M310 130 L410 130" stroke="%23ccc" stroke-width="1" />
  <circle cx="360" cy="130" r="48" fill="none" stroke="%23001a4d" stroke-width="1" stroke-dasharray="5,5"/>

  <!-- Texto ESPORTE -->
  <text x="245" y="275" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="62" fill="white" text-anchor="middle" style="text-transform: uppercase; letter-spacing: -3px;">ESPORTE</text>
  
  <!-- Caixa COXIM -->
  <rect x="100" y="295" width="290" height="75" rx="8" fill="%23d90429" transform="skewX(-5) translate(5, 0)"/>
  <text x="250" y="352" font-family="Arial, sans-serif" font-weight="900" font-style="italic" font-size="74" fill="white" text-anchor="middle" style="text-transform: uppercase; letter-spacing: -2px;">COXIM</text>
  
  <!-- Detalhes de Brilho -->
  <path d="M120 120 Q 250 80 380 120" fill="none" stroke="white" stroke-width="2" opacity="0.3" />
</svg>`;

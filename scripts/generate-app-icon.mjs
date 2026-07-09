// Prépare les sources d'icône/splash pour @capacitor/assets à partir du
// logo du jeu (logo.png). Le logo n'étant pas carré, on le centre sur un
// canvas carré (fond sombre = couleur de l'app) pour éviter toute
// déformation, puis @capacitor/assets génère les déclinaisons Android.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SIZE = 1024
const SPLASH = 2732
const BG = { r: 0x09, g: 0x09, b: 0x0b, alpha: 1 } // #09090b (background_color de l'app)
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }
const SOURCE = 'logo.png'

mkdirSync('assets', { recursive: true })

/** Logo redimensionné (aspect conservé) dans un carré `box`, centré. */
async function fittedLogo(box) {
  return sharp(SOURCE)
    .resize({ width: box, height: box, fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()
}

/** Canvas carré `size` avec le logo centré, sur fond `bg`. */
async function canvas(size, logoBox, bg, out) {
  const logo = await fittedLogo(logoBox)
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out)
}

// Icône adaptative : avant-plan (logo transparent, zone de sécurité ~62%)
await canvas(SIZE, Math.round(SIZE * 0.62), TRANSPARENT, 'assets/icon-foreground.png')
// Icône adaptative : arrière-plan uni sombre
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: BG } })
  .png()
  .toFile('assets/icon-background.png')
// Icône legacy (Android < 8) : logo sur fond sombre, un peu plus grand
await canvas(SIZE, Math.round(SIZE * 0.74), BG, 'assets/icon-only.png')

// Écrans de démarrage (splash) clair & sombre, logo centré sur fond sombre
await canvas(SPLASH, Math.round(SPLASH * 0.22), BG, 'assets/splash.png')
await canvas(SPLASH, Math.round(SPLASH * 0.22), BG, 'assets/splash-dark.png')

console.log('✓ Sources d\'icône générées dans assets/ à partir de', SOURCE)

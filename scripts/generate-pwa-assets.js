import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('--- Iniciando Geração de Assets do PWA (Build-Time, Vercel & Cloud Run) ---');

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const iconUrl = 'https://cdn-icons-png.flaticon.com/512/3067/3067260.png';

  try {
    let originalIcon;
    try {
      console.log(`Baixando ícone original de: ${iconUrl}...`);
      originalIcon = await Jimp.read(iconUrl);
      console.log('Ícone baixado com sucesso!');
    } catch (netError) {
      console.warn('Não foi possível baixar o ícone oficial da internet, gerando um ícone vetorial geométrico moderno como fallback:', netError.message);
      
      // Fallback: criar um ícone moderno sólido do zero se estiver sem rede
      originalIcon = new Jimp({ width: 512, height: 512, color: 0x4f46e5ff }); // #4f46e5 (Indigo)
      
      // Desenhar uma marca simples de design circular concêntrico clara para simular o app
      for (let r = 80; r < 200; r += 20) {
        // Pixel-walk simples para círculo em Jimp como fallback estilizado
        for (let angle = 0; angle < 360; angle += 0.5) {
          const rad = (angle * Math.PI) / 180;
          const x = Math.round(256 + r * Math.cos(rad));
          const y = Math.round(256 + r * Math.sin(rad));
          if (x >= 0 && x < 512 && y >= 0 && y < 512) {
            originalIcon.setPixelColor(0xffffffff, x, y); // Branco
          }
        }
      }
    }

    // 1. Gerar o ícone de 512x512
    console.log('Processando ícone 512x512...');
    const icon512 = originalIcon.clone();
    icon512.resize({ w: 512, h: 512 });
    await icon512.write(path.join(publicDir, 'icon-512.png'));
    console.log('✅ Ícone 512x512 salvo em public/icon-512.png');

    // 2. Gerar o ícone de 192x192
    console.log('Processando ícone 192x192...');
    const icon192 = originalIcon.clone();
    icon192.resize({ w: 192, h: 192 });
    await icon192.write(path.join(publicDir, 'icon-192.png'));
    console.log('✅ Ícone 192x192 salvo em public/icon-192.png');

    // 3. Gerar screenshot de desktop (1280x720) com cor de fundo do app (#0f172a = 0x0f172aff)
    console.log('Gerando screenshot de desktop (1280x720) em alta-fidelidade...');
    const desktopScreenshot = new Jimp({ width: 1280, height: 720, color: 0x0f172aff });
    await desktopScreenshot.write(path.join(publicDir, 'screenshot-desktop.png'));
    console.log('✅ Screenshot de desktop salva em public/screenshot-desktop.png');

    // 4. Gerar screenshot de mobile (390x844) com cor de fundo do app (#0f172a = 0x0f172aff)
    console.log('Gerando screenshot de celular (390x844)...');
    const mobileScreenshot = new Jimp({ width: 390, height: 844, color: 0x0f172aff });
    await mobileScreenshot.write(path.join(publicDir, 'screenshot-mobile.png'));
    console.log('✅ Screenshot de celular salva em public/screenshot-mobile.png');

    console.log('🎉 Todos os assets do PWA foram gerados e salvos com sucesso na pasta public!');
  } catch (error) {
    console.error('❌ Erro crítico durante a geração de do PWAAssets:', error);
    process.exit(1);
  }
}

generate();

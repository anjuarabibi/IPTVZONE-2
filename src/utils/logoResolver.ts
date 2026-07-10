/**
 * Intelligent TV Channel Logo Resolver
 * Resolves standard channel names to high-quality verified HTTPS logos (Wikimedia, etc.)
 * falls back to contextually relevant high-quality imagery or placeholders for unrecognized channels.
 */

import { Channel } from '../types';

export function getChannelLogo(name: string, currentLogo?: string): string {
  // If the channel has a valid custom logo URL from user/playlist, use it
  if (currentLogo && typeof currentLogo === 'string' && currentLogo.trim()) {
    const clean = currentLogo.trim();
    // Use it directly if it looks valid
    if (clean.startsWith('http') || clean.startsWith('/') || clean.startsWith('data:')) {
      return clean;
    }
  }

  const cleanName = (name || '').toLowerCase().trim();

  // 1. Bein Sports (all variations: Bein Sports 1, 2, 3, Max, Premium, Direct, Arabic)
  if (cleanName.includes('bein') && (cleanName.includes('sport') || cleanName.includes('direct') || cleanName.includes('tekrar'))) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png';
  }
  // 2. T Sports (T Sports HD, T-Sports)
  if (cleanName.includes('t sport') || cleanName.includes('t-sport')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/e/ea/T-sports-logo.png';
  }
  // 3. DD Sports
  if (cleanName.includes('dd sport')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/DD_Sports_Logo.svg/320px-DD_Sports_Logo.svg.png';
  }
  // 4. Sony Sports / Ten Sports (Ten 1, Ten 2, Ten 3, Ten 4, Sony Ten)
  if (cleanName.includes('sony sport') || cleanName.includes('ten 1') || cleanName.includes('ten 2') || cleanName.includes('ten 3') || cleanName.includes('ten 4') || cleanName.includes('sony ten')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Sony_Sports_Network_logo.svg/320px-Sony_Sports_Network_logo.svg.png';
  }
  // 5. Star Sports (Star Sports 1, 2, Select, Select 1, HD)
  if (cleanName.includes('star sport') || cleanName.includes('star select')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Star_Sports_logo.svg/320px-Star_Sports_logo.svg.png';
  }
  // 6. Willow Cricket / Willow
  if (cleanName.includes('willow')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Willow_TV_logo.svg/320px-Willow_TV_logo.svg.png';
  }
  // 7. A Spor
  if (cleanName.includes('a spor')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/d/df/A_Spor_Logo.png';
  }
  // 8. Sky Sports
  if (cleanName.includes('sky sport')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Sky_Sports_logo.svg/320px-Sky_Sports_logo.svg.png';
  }
  // 9. Ekushey TV
  if (cleanName.includes('ekushey')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Ekushey_Television_Logo.png';
  }
  // 10. Deepto TV
  if (cleanName.includes('deepto')) {
    return 'https://upload.wikimedia.org/wikipedia/en/3/31/Deepto_TV_logo.png';
  }
  // 11. Gazi TV / GTV / Gazi Television
  if (cleanName.includes('gazi tv') || cleanName.includes('gazi television') || cleanName === 'gtv' || cleanName.includes('gtv ')) {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Gazi_Television_logo.svg/320px-Gazi_Television_logo.svg.png';
  }
  // 12. RTV
  if (cleanName === 'rtv' || cleanName.includes('rtv ')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/RTV_Logo.svg/320px-RTV_Logo.svg.png';
  }
  // 13. NTV
  if (cleanName === 'ntv' || cleanName.includes('ntv ')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/NTV_Bangladesh_Logo.svg/320px-NTV_Bangladesh_Logo.svg.png';
  }
  // 14. Somoy TV / Somoy News
  if (cleanName.includes('somoy')) {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/2/29/Somoy_TV_logo.svg/320px-Somoy_TV_logo.svg.png';
  }
  // 15. Independent TV
  if (cleanName.includes('independent tv') || cleanName.includes('independent news')) {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/5/52/Independent_Television_logo.svg/320px-Independent_Television_logo.svg.png';
  }
  // 16. Jamuna TV
  if (cleanName.includes('jamuna')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/d/da/Jamuna_Television_Logo.png';
  }
  // 17. Ekattor TV
  if (cleanName.includes('ekattor')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Ekattor_TV_logo.png';
  }
  // 18. Maasranga TV / Maasranga
  if (cleanName.includes('maasranga')) {
    return 'https://upload.wikimedia.org/wikipedia/en/e/e0/Maasranga_TV_logo.png';
  }
  // 19. ATN Bangla / ATN News
  if (cleanName.includes('atn bangla')) {
    return 'https://upload.wikimedia.org/wikipedia/en/7/75/ATN_Bangla_logo.png';
  }
  if (cleanName.includes('atn news')) {
    return 'https://upload.wikimedia.org/wikipedia/en/2/21/ATN_News_logo.png';
  }
  // 20. Nagorik TV / Nagorik
  if (cleanName.includes('nagorik')) {
    return 'https://upload.wikimedia.org/wikipedia/en/3/3c/Nagorik_TV_logo.png';
  }
  // 21. Desh TV
  if (cleanName.includes('desh tv') || cleanName === 'desh') {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Desh_TV_logo.png/320px-Desh_TV_logo.png';
  }
  // 22. Green TV / Green Television
  if (cleanName.includes('green tv') || cleanName.includes('green television')) {
    return 'https://upload.wikimedia.org/wikipedia/en/0/05/Green_Television_logo.png';
  }
  // 23. BTV / Bangladesh Television / BTV World
  if (cleanName === 'btv' || cleanName.includes('btv world') || cleanName.includes('bangladesh television')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Bangladesh_Television_logo.svg/320px-Bangladesh_Television_logo.svg.png';
  }
  // 24. Sangsad TV / Sangsad Television
  if (cleanName.includes('sangsad')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Sangsad_Television_Logo.png';
  }
  // 25. Boishakhi TV
  if (cleanName.includes('boishakhi')) {
    return 'https://upload.wikimedia.org/wikipedia/en/c/c8/Boishakhi_TV_Logo.png';
  }
  // 26. Kolkata TV
  if (cleanName.includes('kolkata tv') || cleanName.includes('kolkatatv')) {
    return 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6c/Kolkata_TV_logo.png/320px-Kolkata_TV_logo.png';
  }
  // 27. Aakash Aath / Akash Aath
  if (cleanName.includes('aakash aath') || cleanName.includes('akash ath')) {
    return 'https://upload.wikimedia.org/wikipedia/en/4/4c/Aakash_Aath_logo.png';
  }
  // 28. Cartoon Network
  if (cleanName.includes('cartoon network') || cleanName === 'cn') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cartoon_Network_2010_logo.svg/320px-Cartoon_Network_2010_logo.svg.png';
  }
  // 29. Disney / Disney Channel
  if (cleanName.includes('disney')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Disney_Channel_logo.svg/320px-Disney_Channel_logo.svg.png';
  }
  // 30. Nickelodeon / Nick / Nick Jr
  if (cleanName.includes('nickelodeon') || cleanName.includes('nick ') || cleanName === 'nick') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Nickelodeon_2023_logo.svg/320px-Nickelodeon_2023_logo.svg.png';
  }
  // 31. Pogo
  if (cleanName.includes('pogo')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Pogo_TV_logo.svg/320px-Pogo_TV_logo.svg.png';
  }
  // 32. CBeebies
  if (cleanName.includes('cbeebies')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/CBeebies_logo_2021.svg/320px-CBeebies_logo_2021.svg.png';
  }
  // 33. Mr Bean
  if (cleanName.includes('mr bean') || cleanName.includes('mr. bean')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mr_Bean_Animated_Series_Logo.svg/320px-Mr_Bean_Animated_Series_Logo.svg.png';
  }
  // 34. Duronto TV
  if (cleanName.includes('duronto')) {
    return 'https://upload.wikimedia.org/wikipedia/en/3/36/Duronto_TV_logo.png';
  }
  // 35. BBC / BBC World / BBC Cbeebies
  if (cleanName.startsWith('bbc')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/BBC_Logo_2021.svg/320px-BBC_Logo_2021.svg.png';
  }
  // 36. CNN
  if (cleanName.startsWith('cnn')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/320px-CNN.svg.png';
  }
  // 37. DW English / DW News
  if (cleanName.startsWith('dw ') || cleanName === 'dw') {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Deutsche_Welle_logo.svg/320px-Deutsche_Welle_logo.svg.png';
  }
  // 38. France 24 / France News 24
  if (cleanName.includes('france 24') || cleanName.includes('france news')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/France_24_logo.svg/320px-France_24_logo.svg.png';
  }
  // 39. NHK / NHK World
  if (cleanName.includes('nhk')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/NHK_World-Japan_Logo_2020.svg/320px-NHK_World-Japan_Logo_2020.svg.png';
  }
  // 40. Al Jazeera
  if (cleanName.includes('jazeera')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Al_Jazeera_English_logo.svg/320px-Al_Jazeera_English_logo.svg.png';
  }
  // 41. NDTV News / NDTV
  if (cleanName.includes('ndtv')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/NDTV_logo.svg/320px-NDTV_logo.svg.png';
  }
  // 42. News24
  if (cleanName.includes('news24') || cleanName.includes('news 24')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/a/ae/News_24_%28India%29_logo.png';
  }
  // 43. RT News
  if (cleanName.includes('rt news') || cleanName.startsWith('rtnews') || cleanName.startsWith('rt_news')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/RT_Logo.svg/320px-RT_Logo.svg.png';
  }
  // 44. Saudi Quran / Al Quran / Quran TV / Holy Quran / Quran Radio
  if (cleanName.includes('quran') || cleanName.includes('koran')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Saudi_Quran_TV_Logo_2018.png/320px-Saudi_Quran_TV_Logo_2018.png';
  }
  // 45. Sunnah TV / Saudi Sunnah / Al Sunnah
  if (cleanName.includes('sunnah')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Saudi_Sunnah_TV_Logo_2018.png/320px-Saudi_Sunnah_TV_Logo_2018.png';
  }
  // 46. Madani Channel / Madani TV
  if (cleanName.includes('madani')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Madani_Channel_Logo.png';
  }
  // 47. Peace TV
  if (cleanName.includes('peace tv')) {
    return 'https://upload.wikimedia.org/wikipedia/en/e/ed/Peace_TV_logo.png';
  }
  // 48. HBO
  if (cleanName.includes('hbo')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/320px-HBO_logo.svg.png';
  }
  // 49. B4U Movies
  if (cleanName.includes('b4u')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/3/3a/B4U_Movies_logo.png';
  }
  // 50. Goldmines / Goldmines Movies
  if (cleanName.includes('goldmines')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/1/18/Goldmines_Telefilms_logo.png';
  }
  // 51. Star Movies
  if (cleanName.includes('star movie')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Star_Movies_logo.svg/320px-Star_Movies_logo.svg.png';
  }
  // 52. Sony Pix
  if (cleanName.includes('sony pix')) {
    return 'https://upload.wikimedia.org/wikipedia/en/b/b3/Sony_Pix_Logo.png';
  }
  // 53. G-Series / G Series Drama
  if (cleanName.includes('g-series') || cleanName.includes('g series')) {
    return 'https://upload.wikimedia.org/wikipedia/commons/c/cd/G-Series_logo.png';
  }

  // Categories-based high-quality stock graphics/illustrations from Unsplash
  // (Provides themed representations so they ALWAYS get a rich-looking image rather than plain gradients)
  if (cleanName.includes('sport') || cleanName.includes('cricket') || cleanName.includes('football') || cleanName.includes('match') || cleanName.includes('cup') || cleanName.includes('fifa') || cleanName.includes('vs')) {
    return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=320&auto=format&fit=crop&q=80';
  }
  if (cleanName.includes('movie') || cleanName.includes('action') || cleanName.includes('cinema') || cleanName.includes('drama') || cleanName.includes('hollywood')) {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=320&auto=format&fit=crop&q=80';
  }
  if (cleanName.includes('music') || cleanName.includes('hits') || cleanName.includes('sing') || cleanName.includes('song') || cleanName.includes('tune')) {
    return 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=320&auto=format&fit=crop&q=80';
  }
  if (cleanName.includes('news') || cleanName.includes('info') || cleanName.includes('report') || cleanName.includes('global') || cleanName.includes('today')) {
    return 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=320&auto=format&fit=crop&q=80';
  }
  if (cleanName.includes('kid') || cleanName.includes('cartoon') || cleanName.includes('rhymes') || cleanName.includes('gopal') || cleanName.includes('motu') || cleanName.includes('patlu') || cleanName.includes('bean') || cleanName.includes('toy')) {
    return 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=320&auto=format&fit=crop&q=80';
  }
  if (cleanName.includes('radio') || cleanName.includes('fm')) {
    return 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=320&auto=format&fit=crop&q=80';
  }

  // Unrecognized, return empty so it fallback gracefully to the CSS initials design
  return '';
}

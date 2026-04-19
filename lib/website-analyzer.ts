/**
 * Website Analyzer
 * Free tool to detect tech stack, tracking pixels, and ad platforms
 * Used to enrich lead data without requiring paid APIs
 */

export interface WebsiteAnalysis {
  techStack?: string; // e.g., "WordPress", "Shopify", "Custom"
  trackingPixels?: string[]; // e.g., ["Google Analytics", "Facebook Pixel"]
  adPlatforms?: string[]; // e.g., ["Google Ads", "Facebook Ads"]
  hasSSL?: boolean;
}

/**
 * Detect tech stack from website headers and content
 * Returns the detected platform or "Custom" if unknown
 */
export async function detectTechStack(url: string): Promise<string> {
  try {
    if (!url || !url.startsWith('http')) {
      url = `https://${url}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (ReBoost Lead Analyzer)',
      },
    });

    if (!response.ok) {
      return 'Unknown';
    }

    // Check for X-Powered-By header (common for some platforms)
    const poweredBy = response.headers.get('X-Powered-By') || '';
    if (poweredBy) {
      if (poweredBy.toLowerCase().includes('wordpress')) return 'WordPress';
      if (poweredBy.toLowerCase().includes('shopify')) return 'Shopify';
      if (poweredBy.toLowerCase().includes('wix')) return 'Wix';
    }

    // Check for Server header
    const server = response.headers.get('Server') || '';
    if (server.toLowerCase().includes('wordpress')) return 'WordPress';

    // Parse HTML to detect tech stack
    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // WordPress detection
    if (
      lowerHtml.includes('wp-content') ||
      lowerHtml.includes('wp-includes') ||
      lowerHtml.includes('/wp-json')
    ) {
      return 'WordPress';
    }

    // Shopify detection
    if (
      lowerHtml.includes('shopify.com') ||
      lowerHtml.includes('shopifycdn.com') ||
      lowerHtml.includes('myshopify.com')
    ) {
      return 'Shopify';
    }

    // Wix detection
    if (
      lowerHtml.includes('wix.com') ||
      lowerHtml.includes('wixstatic.com') ||
      lowerHtml.includes('site100.wix.com')
    ) {
      return 'Wix';
    }

    // Squarespace detection
    if (lowerHtml.includes('squarespace.com')) {
      return 'Squarespace';
    }

    // Webflow detection
    if (lowerHtml.includes('webflow.io') || lowerHtml.includes('webflow.com')) {
      return 'Webflow';
    }

    // GoDaddy detection
    if (lowerHtml.includes('godaddy.com')) {
      return 'GoDaddy';
    }

    // Joomla detection
    if (
      lowerHtml.includes('joomla') ||
      lowerHtml.includes('com_') ||
      lowerHtml.includes('index.php?option=com')
    ) {
      return 'Joomla';
    }

    // Drupal detection
    if (lowerHtml.includes('drupal') || lowerHtml.includes('/themes/')) {
      return 'Drupal';
    }

    // Magento detection
    if (lowerHtml.includes('magento') || lowerHtml.includes('mage/')) {
      return 'Magento';
    }

    // WooCommerce detection
    if (lowerHtml.includes('woocommerce')) {
      return 'WooCommerce';
    }

    // Next.js detection
    if (
      lowerHtml.includes('__next') ||
      response.headers.get('Server')?.includes('Next.js')
    ) {
      return 'Next.js';
    }

    // React detection
    if (
      lowerHtml.includes('react') ||
      lowerHtml.includes('__react') ||
      lowerHtml.includes('root')
    ) {
      return 'React';
    }

    // Vue detection
    if (lowerHtml.includes('vue')) {
      return 'Vue.js';
    }

    // Custom/Unknown
    return 'Custom';
  } catch (error) {
    console.error('Error detecting tech stack:', error);
    return 'Unknown';
  }
}

/**
 * Detect tracking pixels and analytics platforms
 */
export async function detectTrackingPixels(url: string): Promise<string[]> {
  const pixels: string[] = [];

  try {
    if (!url || !url.startsWith('http')) {
      url = `https://${url}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (ReBoost Lead Analyzer)',
      },
    });

    if (!response.ok) {
      return pixels;
    }

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Google Analytics detection
    if (
      lowerHtml.includes('gtag(') ||
      lowerHtml.includes('google-analytics') ||
      lowerHtml.includes('_gid') ||
      lowerHtml.includes('UA-') ||
      lowerHtml.includes('G-')
    ) {
      pixels.push('Google Analytics');
    }

    // Google Tag Manager
    if (lowerHtml.includes('googletagmanager.com') || lowerHtml.includes('gtm.js')) {
      pixels.push('Google Tag Manager');
    }

    // Facebook Pixel
    if (lowerHtml.includes("fbq('init'") || lowerHtml.includes('facebook.com/en_US/fbevents.js')) {
      pixels.push('Facebook Pixel');
    }

    // LinkedIn Pixel
    if (lowerHtml.includes('linkedin') && lowerHtml.includes('px.ads.linkedin.com')) {
      pixels.push('LinkedIn Pixel');
    }

    // TikTok Pixel
    if (lowerHtml.includes('ttq.load') || lowerHtml.includes('tiktok.com/pixels')) {
      pixels.push('TikTok Pixel');
    }

    // Hotjar
    if (lowerHtml.includes('hotjar.com') || lowerHtml.includes('hj.readystate')) {
      pixels.push('Hotjar');
    }

    // Intercom
    if (lowerHtml.includes('intercom.io') || lowerHtml.includes('intercom-frame')) {
      pixels.push('Intercom');
    }

    // Drift
    if (lowerHtml.includes('drift.com') || lowerHtml.includes('stg-drift.com')) {
      pixels.push('Drift');
    }

    // Zendesk
    if (lowerHtml.includes('zendesk') || lowerHtml.includes('zdassets.com')) {
      pixels.push('Zendesk');
    }

    // Hubspot
    if (lowerHtml.includes('hs-scripts.com') || lowerHtml.includes('hubspot')) {
      pixels.push('HubSpot');
    }

    // Segment
    if (lowerHtml.includes('cdn.segment.com') || lowerHtml.includes('analytics.js')) {
      pixels.push('Segment');
    }

    // Mixpanel
    if (lowerHtml.includes('mixpanel.com') || lowerHtml.includes('mixpanel.js')) {
      pixels.push('Mixpanel');
    }

    // Amplitude
    if (lowerHtml.includes('amplitude.com') || lowerHtml.includes('amplitude.js')) {
      pixels.push('Amplitude');
    }

    return pixels;
  } catch (error) {
    console.error('Error detecting tracking pixels:', error);
    return pixels;
  }
}

/**
 * Detect active advertising platforms
 */
export async function detectAdPlatforms(url: string): Promise<string[]> {
  const platforms: string[] = [];

  try {
    if (!url || !url.startsWith('http')) {
      url = `https://${url}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (ReBoost Lead Analyzer)',
      },
    });

    if (!response.ok) {
      return platforms;
    }

    const html = await response.text();
    const lowerHtml = html.toLowerCase();

    // Google Ads
    if (
      lowerHtml.includes('googleadservices.com') ||
      lowerHtml.includes('google.com/ads/') ||
      lowerHtml.includes('conversion_label')
    ) {
      platforms.push('Google Ads');
    }

    // Facebook Ads Manager
    if (
      lowerHtml.includes("fbq('track'") ||
      lowerHtml.includes('facebook.com/ads') ||
      lowerHtml.includes('conversion-pixel')
    ) {
      platforms.push('Facebook Ads');
    }

    // LinkedIn Ads
    if (lowerHtml.includes('px.ads.linkedin.com') || lowerHtml.includes('linkedin.com/ads')) {
      platforms.push('LinkedIn Ads');
    }

    // TikTok Ads
    if (lowerHtml.includes('tiktok.com/pixels') || lowerHtml.includes('ttq.track')) {
      platforms.push('TikTok Ads');
    }

    // Microsoft Ads (Bing)
    if (lowerHtml.includes('bat.bing.com') || lowerHtml.includes('uetq')) {
      platforms.push('Microsoft Ads');
    }

    // Snapchat
    if (lowerHtml.includes('snapchat.com/pixels')) {
      platforms.push('Snapchat Ads');
    }

    // Pinterest
    if (lowerHtml.includes('pinterest.com/pin') || lowerHtml.includes('pinimg.com')) {
      platforms.push('Pinterest Ads');
    }

    // Reddit
    if (lowerHtml.includes('reddit.com/ads') || lowerHtml.includes('redditmedia.com')) {
      platforms.push('Reddit Ads');
    }

    return platforms;
  } catch (error) {
    console.error('Error detecting ad platforms:', error);
    return platforms;
  }
}

/**
 * Complete website analysis
 * Detects tech stack, tracking pixels, and ad platforms
 */
export async function analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
  // Run all detections in parallel
  const [techStack, trackingPixels, adPlatforms] = await Promise.all([
    detectTechStack(url),
    detectTrackingPixels(url),
    detectAdPlatforms(url),
  ]);

  return {
    techStack,
    trackingPixels: trackingPixels.length > 0 ? trackingPixels : undefined,
    adPlatforms: adPlatforms.length > 0 ? adPlatforms : undefined,
    hasSSL: url.startsWith('https'),
  };
}

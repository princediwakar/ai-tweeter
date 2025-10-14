// lib/utils/unsplashUtils.ts

/**
 * Fetch a background image from Unsplash, optimized for size.
 */
export async function fetchUnsplashImage(query: string, width: number, height: number): Promise<string> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) {
      console.warn('UNSPLASH_ACCESS_KEY not provided, using gradient background');
      return '';
    }
    try {
      const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&color=white&per_page=1`;
      const controller = new AbortController();
  
      // --- FIX: INCREASE TIMEOUT FROM 10000ms to 25000ms ---
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 seconds
  
      const response = await fetch(url, {
        headers: {
          'Authorization': `Client-ID ${accessKey}`,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
  
      clearTimeout(timeoutId);
  
      if (!response.ok) {
        console.warn(`❌ Unsplash API error: ${response.status} ${response.statusText}`);
        return '';
      }
  
      const data = await response.json();
      if (data.urls?.raw) {
        const optimizedUrl = `${data.urls.raw}&w=${width}&h=${height}&fit=crop&fm=jpg&q=80&sat=-20&bright=10`;
        console.log('✅ Successfully fetched Unsplash background image');
        return optimizedUrl;
      }
  
      console.warn('⚠️ Unsplash response missing image URLs');
      return '';
  
    } catch (error) {
      console.warn('❌ Error fetching Unsplash image:', error);
      return '';
    }
  }
import { LiveCategory, LiveChannel, LivePlaylistItem } from '@/types/live';

export class LiveChannelParser {
  /**
   * Parse M3U playlist format
   */
  static parseM3U(content: string): LivePlaylistItem[] {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const items: LivePlaylistItem[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments and empty lines
      if (line.startsWith('#EXTM3U') || !line) continue;
      
      // Handle #EXTINF lines
      if (line.startsWith('#EXTINF:')) {
        const info = line.substring(8); // Remove #EXTINF:
        const nextLine = lines[i + 1];
        
        if (nextLine && !nextLine.startsWith('#')) {
          const [, ...titleParts] = info.split(',');
          const title = titleParts.join(',').trim();
          
          items.push({
            name: title,
            url: nextLine,
          });
          i++; // Skip next line as it's the URL
        }
      }
      // Handle direct format: "Name,URL"
      else if (line.includes(',http')) {
        const [name, ...urlParts] = line.split(',');
        const url = urlParts.join(',');
        
        if (name && url) {
          items.push({
            name: name.trim(),
            url: url.trim(),
          });
        }
      }
    }
    
    return items;
  }

  /**
   * Parse the Chinese TV format from the uploaded file
   */
  static parseChineseTVFormat(content: string): LiveCategory[] {
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    const categories: Map<string, LiveChannel[]> = new Map();
    let currentCategory = '未分类';
    
    for (const line of lines) {
      // Check for category headers (format: "CategoryName,#genre#")
      if (line.includes(',#genre#')) {
        currentCategory = line.replace(',#genre#', '').trim();
        if (!categories.has(currentCategory)) {
          categories.set(currentCategory, []);
        }
        continue;
      }
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) continue;
      
      // Parse channel lines (format: "ChannelName,URL")
      const arrowIndex = line.indexOf('→');
      if (arrowIndex === -1) continue;
      
      const afterArrow = line.substring(arrowIndex + 1);
      const commaIndex = afterArrow.indexOf(',');
      
      if (commaIndex === -1) continue;
      
      const channelName = afterArrow.substring(0, commaIndex).trim();
      const channelUrl = afterArrow.substring(commaIndex + 1).trim();
      
      if (!channelName || !channelUrl) continue;
      
      // Find existing channel or create new one
      const categoryChannels = categories.get(currentCategory) || [];
      const existingChannel = categoryChannels.find(ch => ch.name === channelName);
      
      if (existingChannel) {
        // Add URL to existing channel
        if (!existingChannel.urls.includes(channelUrl)) {
          existingChannel.urls.push(channelUrl);
        }
      } else {
        // Create new channel
        const channel: LiveChannel = {
          id: `${currentCategory}-${channelName}`.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-'),
          name: channelName,
          urls: [channelUrl],
          category: currentCategory,
          isActive: true,
          format: this.detectStreamFormat(channelUrl),
          quality: this.detectQuality(channelName),
          language: 'zh-CN',
          country: 'CN',
        };
        
        categoryChannels.push(channel);
      }
      
      categories.set(currentCategory, categoryChannels);
    }
    
    // Convert to LiveCategory array
    const result: LiveCategory[] = [];
    let sortOrder = 0;
    
    for (const [categoryName, channels] of Array.from(categories.entries())) {
      if (channels.length > 0) {
        result.push({
          id: categoryName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-'),
          name: categoryName,
          channels: channels.sort((a: LiveChannel, b: LiveChannel) => a.name.localeCompare(b.name, 'zh-CN')),
          sortOrder: sortOrder++,
        });
      }
    }
    
    return result.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  /**
   * Detect stream format from URL
   */
  private static detectStreamFormat(url: string): LiveChannel['format'] {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('.m3u8') || urlLower.includes('hls')) {
      return 'HLS';
    } else if (urlLower.includes('.mpd') || urlLower.includes('dash')) {
      return 'DASH';
    } else if (urlLower.includes('.flv')) {
      return 'FLV';
    } else if (urlLower.startsWith('rtmp://')) {
      return 'RTMP';
    }
    
    return 'HLS'; // Default to HLS
  }

  /**
   * Detect quality from channel name
   */
  private static detectQuality(name: string): LiveChannel['quality'] {
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('hd') || nameLower.includes('高清')) {
      return 'HD';
    } else if (nameLower.includes('fhd') || nameLower.includes('1080p') || nameLower.includes('全高清')) {
      return 'FHD';
    }
    
    return 'SD'; // Default to SD
  }

  /**
   * Validate channel URL
   */
  static async validateChannelUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Extract channel logo URL (placeholder for future implementation)
   */
  static extractLogoUrl(_channelName: string): string | undefined {
    // This could be implemented to map channel names to logo URLs
    // or extract logos from EPG data
    return undefined;
  }

  /**
   * Clean and normalize channel name
   */
  static normalizeChannelName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
      .trim();
  }

  /**
   * Generate channel ID from name and category
   */
  static generateChannelId(name: string, category: string): string {
    const cleanName = this.normalizeChannelName(name);
    const cleanCategory = category.replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '');
    return `${cleanCategory}-${cleanName}`.replace(/\s+/g, '-').toLowerCase();
  }

  /**
   * Parse JSON playlist format
   */
  static parseJSON(content: string): LivePlaylistItem[] {
    try {
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return data.map(item => ({
          name: item.name || item.title || '',
          url: item.url || item.stream || '',
          category: item.category || item.group || '',
          logo: item.logo || item.icon || undefined,
        }));
      }
      
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Convert LiveCategory array to M3U format
   */
  static toM3U(categories: LiveCategory[]): string {
    let m3u = '#EXTM3U\n\n';
    
    for (const category of categories) {
      for (const channel of category.channels) {
        m3u += `#EXTINF:-1 tvg-name="${channel.name}" group-title="${category.name}",${channel.name}\n`;
        m3u += `${channel.urls[0]}\n\n`;
      }
    }
    
    return m3u;
  }

  /**
   * Convert LiveCategory array to JSON format
   */
  static toJSON(categories: LiveCategory[]): string {
    const channels: LivePlaylistItem[] = [];
    
    for (const category of categories) {
      for (const channel of category.channels) {
        channels.push({
          name: channel.name,
          url: channel.urls[0],
          category: category.name,
          logo: channel.logo,
        });
      }
    }
    
    return JSON.stringify(channels, null, 2);
  }
}
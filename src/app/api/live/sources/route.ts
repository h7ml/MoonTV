import { access,readFile, writeFile } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

import { LiveChannelParser } from '@/lib/live-parser';

import { LiveSourceConfig } from '@/types/live';

// Default live source configuration
const defaultSources: LiveSourceConfig[] = [
  {
    id: 'default-chinese-tv',
    name: 'Chinese TV Channels',
    description: 'Default Chinese TV channels from 直播.txt',
    type: 'file',
    format: 'txt',
    enabled: true,
    refreshInterval: 24 * 60 * 60 * 1000, // 24 hours
    lastUpdate: new Date(),
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'list':
        return handleListSources();
      case 'validate':
        return handleValidateSource(searchParams);
      default:
        return handleListSources();
    }
  } catch (error) {
    console.error('Live sources API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'add':
        return handleAddSource(request);
      case 'update':
        return handleUpdateSource(request);
      case 'delete':
        return handleDeleteSource(request);
      case 'import':
        return handleImportSource(request);
      case 'refresh':
        return handleRefreshSource(request);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Live sources API POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

async function handleListSources() {
  try {
    const sources = await loadSourcesConfig();
    return NextResponse.json({ sources });
  } catch (error) {
    return NextResponse.json({ sources: defaultSources });
  }
}

async function handleValidateSource(searchParams: URLSearchParams) {
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'MoonTV/1.0',
      },
    });

    const isValid = response.ok;
    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');

    return NextResponse.json({
      valid: isValid,
      status: response.status,
      contentType,
      contentLength: contentLength ? parseInt(contentLength) : null,
    });
  } catch (error) {
    return NextResponse.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function handleAddSource(request: NextRequest) {
  const body = await request.json();
  const { source } = body;

  if (!source || !source.name || !source.type) {
    return NextResponse.json({ error: 'Invalid source data' }, { status: 400 });
  }

  try {
    const sources = await loadSourcesConfig();
    
    // Generate unique ID
    const newSource: LiveSourceConfig = {
      ...source,
      id: `custom-${Date.now()}`,
      lastUpdate: new Date(),
    };

    sources.push(newSource);
    await saveSourcesConfig(sources);

    return NextResponse.json({ source: newSource });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add source' },
      { status: 500 }
    );
  }
}

async function handleUpdateSource(request: NextRequest) {
  const body = await request.json();
  const { id, updates } = body;

  if (!id || !updates) {
    return NextResponse.json({ error: 'ID and updates required' }, { status: 400 });
  }

  try {
    const sources = await loadSourcesConfig();
    const sourceIndex = sources.findIndex(s => s.id === id);

    if (sourceIndex === -1) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    sources[sourceIndex] = {
      ...sources[sourceIndex],
      ...updates,
      lastUpdate: new Date(),
    };

    await saveSourcesConfig(sources);

    return NextResponse.json({ source: sources[sourceIndex] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}

async function handleDeleteSource(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    const sources = await loadSourcesConfig();
    const updatedSources = sources.filter(s => s.id !== id);

    if (updatedSources.length === sources.length) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    await saveSourcesConfig(updatedSources);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete source' },
      { status: 500 }
    );
  }
}

async function handleImportSource(request: NextRequest) {
  const body = await request.json();
  const { url, name, format } = body;

  if (!url || !name) {
    return NextResponse.json({ error: 'URL and name required' }, { status: 400 });
  }

  try {
    // Fetch the source content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const content = await response.text();
    
    // Parse the content to count channels
    let channelCount = 0;
    let categories: string[] = [];

    try {
      if (format === 'm3u' || url.includes('.m3u')) {
        const items = LiveChannelParser.parseM3U(content);
        channelCount = items.length;
        categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized')));
      } else if (format === 'json') {
        const items = LiveChannelParser.parseJSON(content);
        channelCount = items.length;
        categories = Array.from(new Set(items.map(item => item.category || 'Uncategorized')));
      } else {
        // Try Chinese TV format
        const parsedCategories = LiveChannelParser.parseChineseTVFormat(content);
        channelCount = parsedCategories.reduce((sum, cat) => sum + cat.channels.length, 0);
        categories = parsedCategories.map(cat => cat.name);
      }
    } catch {
      // If parsing fails, still create the source but with unknown counts
    }

    // Create new source
    const newSource: LiveSourceConfig = {
      id: `imported-${Date.now()}`,
      name,
      description: `Imported from ${url}`,
      url,
      type: 'url',
      format: format || 'auto',
      enabled: true,
      refreshInterval: 24 * 60 * 60 * 1000, // 24 hours
      lastUpdate: new Date(),
      channelCount,
      categories,
    };

    const sources = await loadSourcesConfig();
    sources.push(newSource);
    await saveSourcesConfig(sources);

    return NextResponse.json({
      source: newSource,
      preview: {
        channelCount,
        categories,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to import source',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleRefreshSource(request: NextRequest) {
  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    const sources = await loadSourcesConfig();
    const source = sources.find(s => s.id === id);

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    if (source.type === 'url' && source.url) {
      // Refresh from URL
      const response = await fetch(source.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const content = await response.text();
      
      // Update channel count and categories
      let channelCount = 0;
      let categories: string[] = [];

      try {
        const parsedCategories = LiveChannelParser.parseChineseTVFormat(content);
        channelCount = parsedCategories.reduce((sum, cat) => sum + cat.channels.length, 0);
        categories = parsedCategories.map(cat => cat.name);
      } catch {
        // Keep existing counts if parsing fails
        channelCount = source.channelCount || 0;
        categories = source.categories || [];
      }

      // Update source
      const updatedSource = {
        ...source,
        channelCount,
        categories,
        lastUpdate: new Date(),
      };

      const sourceIndex = sources.findIndex(s => s.id === id);
      sources[sourceIndex] = updatedSource;
      await saveSourcesConfig(sources);

      return NextResponse.json({ source: updatedSource });
    } else {
      // For file sources, just update the timestamp
      const updatedSource = {
        ...source,
        lastUpdate: new Date(),
      };

      const sourceIndex = sources.findIndex(s => s.id === id);
      sources[sourceIndex] = updatedSource;
      await saveSourcesConfig(sources);

      return NextResponse.json({ source: updatedSource });
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to refresh source',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function loadSourcesConfig(): Promise<LiveSourceConfig[]> {
  try {
    const configPath = join(process.cwd(), 'live-sources.json');
    await access(configPath);
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Return default sources if file doesn't exist
    return [...defaultSources];
  }
}

async function saveSourcesConfig(sources: LiveSourceConfig[]): Promise<void> {
  const configPath = join(process.cwd(), 'live-sources.json');
  await writeFile(configPath, JSON.stringify(sources, null, 2), 'utf-8');
}
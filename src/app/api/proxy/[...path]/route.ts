export const runtime = 'edge';

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;

    if (!path || path.length === 0) {
      return new Response('Missing path', { status: 400 });
    }

    // 重建原始URL
    const host = path[0];
    const pathname = path.slice(1).join('/');
    const url = new URL(request.url);
    const search = url.search;

    const targetUrl = `https://${host}/${pathname}${search}`;

    // 获取原始请求的headers，但移除一些可能导致问题的headers
    const headers = new Headers();
    const originalHeaders = request.headers;

    // 复制相关的headers
    ['range', 'accept', 'user-agent'].forEach((key) => {
      const value = originalHeaders.get(key);
      if (value) {
        headers.set(key, value);
      }
    });

    // 设置必要的CORS headers
    headers.set('Origin', new URL(targetUrl).origin);
    headers.set('Referer', new URL(targetUrl).origin);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return new Response(
        `Proxy error: ${response.status} ${response.statusText}`,
        { status: response.status }
      );
    }

    // 创建新的响应headers
    const responseHeaders = new Headers();

    // 复制响应headers
    [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag',
    ].forEach((key) => {
      const value = response.headers.get(key);
      if (value) {
        responseHeaders.set(key, value);
      }
    });

    // 添加CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    responseHeaders.set(
      'Access-Control-Allow-Headers',
      'Range, Accept, User-Agent'
    );
    responseHeaders.set(
      'Access-Control-Expose-Headers',
      'Content-Range, Content-Length, Accept-Ranges'
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Proxy error:', error);
    return new Response(
      `Proxy error: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path } = params;

    if (!path || path.length === 0) {
      return new Response(null, { status: 400 });
    }

    const host = path[0];
    const pathname = path.slice(1).join('/');
    const url = new URL(request.url);
    const search = url.search;

    const targetUrl = `https://${host}/${pathname}${search}`;

    const headers = new Headers();
    headers.set('Origin', new URL(targetUrl).origin);
    headers.set('Referer', new URL(targetUrl).origin);

    const response = await fetch(targetUrl, {
      method: 'HEAD',
      headers,
    });

    const responseHeaders = new Headers();
    [
      'content-type',
      'content-length',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag',
    ].forEach((key) => {
      const value = response.headers.get(key);
      if (value) {
        responseHeaders.set(key, value);
      }
    });

    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    return new Response(null, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return new Response(null, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Accept, User-Agent',
      'Access-Control-Max-Age': '86400',
    },
  });
}

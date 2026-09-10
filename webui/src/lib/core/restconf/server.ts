function canHaveBody(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD';
}

async function readProxyBody(request: Request): Promise<ArrayBuffer | undefined> {
  if (!canHaveBody(request.method)) {
    return undefined;
  }

  const body = await request.arrayBuffer();
  return body.byteLength > 0 ? body : undefined;
}

function getApiOrigin(): string | null {
  return process.env.STRATOWEAVE_API_ORIGIN || null;
}

export async function proxyRequest(request: Request, targetPath: string, search = ''): Promise<Response> {
  const origin = getApiOrigin();
  if (!origin) {
    return Response.json(
      {
        message:
          'STRATOWEAVE_API_ORIGIN is not set. Start a quicklab environment or export STRATOWEAVE_API_ORIGIN explicitly.'
      },
      { status: 502 }
    );
  }

  // Only ever proxy to a path under the configured origin. A leading "//"
  // would otherwise be read by `new URL` as a protocol-relative host and turn
  // the proxy into an open relay.
  const pathname = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  if (pathname.startsWith('//') || pathname.includes('\\')) {
    return Response.json({ message: 'Invalid proxy path' }, { status: 400 });
  }

  const headers = new Headers(request.headers);
  headers.delete('connection');
  headers.delete('content-length');
  headers.delete('host');

  const body = await readProxyBody(request);
  const targetUrl = new URL(origin);
  targetUrl.pathname = pathname;
  targetUrl.search = search;

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'follow'
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete('connection');
    responseHeaders.delete('content-length');
    // fetch has already decompressed/de-chunked the body it hands us.
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return Response.json(
      {
        message: error instanceof Error ? error.message : 'Failed to reach upstream API'
      },
      {
        status: 502
      }
    );
  }
}

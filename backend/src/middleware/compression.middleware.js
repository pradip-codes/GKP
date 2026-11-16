const zlib = require('zlib');

/**
 * High-performance, zero-dependency response compression middleware using Node.js built-in zlib.
 * Compresses compressible responses (JSON, text, HTML) > 1024 bytes when the client supports gzip or deflate.
 */
function compressionMiddleware(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip') && !acceptEncoding.includes('deflate')) {
    return next();
  }

  // Intercept write and end / send
  const originalSend = res.send;
  res.send = function (body) {
    if (res.headersSent || !body) {
      return originalSend.call(this, body);
    }

    // Skip if already compressed or 204/304
    if (res.getHeader('Content-Encoding') || res.statusCode === 204 || res.statusCode === 304) {
      return originalSend.call(this, body);
    }

    let buffer;
    const contentType = res.getHeader('Content-Type') || '';
    if (typeof body === 'string') {
      buffer = Buffer.from(body);
    } else if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'object') {
      buffer = Buffer.from(JSON.stringify(body));
      if (!contentType) res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    // Only compress if payload is greater than 1024 bytes (1 KB threshold)
    if (buffer && buffer.length > 1024) {
      res.setHeader('Vary', 'Accept-Encoding');
      if (acceptEncoding.includes('gzip')) {
        try {
          const compressed = zlib.gzipSync(buffer, { level: 6 });
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Length', compressed.length);
          res.removeHeader('ETag');
          return originalSend.call(this, compressed);
        } catch (_) {}
      } else if (acceptEncoding.includes('deflate')) {
        try {
          const compressed = zlib.deflateSync(buffer);
          res.setHeader('Content-Encoding', 'deflate');
          res.setHeader('Content-Length', compressed.length);
          res.removeHeader('ETag');
          return originalSend.call(this, compressed);
        } catch (_) {}
      }
    }

    return originalSend.call(this, body);
  };

  next();
}

/**
 * Public catalog cache header middleware
 * Sets public Cache-Control headers for non-authenticated catalog endpoints.
 */
function catalogCacheMiddleware(maxAgeSeconds = 180, staleSeconds = 300) {
  return (req, res, next) => {
    if (req.method === 'GET' && !req.headers.authorization) {
      res.setHeader('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleSeconds}`);
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  };
}

module.exports = {
  compressionMiddleware,
  catalogCacheMiddleware
};

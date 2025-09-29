// Cloudflare Pages middleware for Next.js
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // Handle API routes
  if (url.pathname.startsWith('/api/')) {
    return next();
  }
  
  // Handle static files
  if (url.pathname.startsWith('/_next/static/')) {
    return next();
  }
  
  // Handle all other routes - let Next.js handle them
  return next();
}

// Backend implementation for Hono with cookie-based authentication
// This should be applied to your existing index.ts file

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign, verify } from 'hono/jwt';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { UAParser } from 'ua-parser-js';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  created_at: string;
  updated_at: string;
}

interface Link {
  id: string;
  user_id: string;
  original_url: string;
  short_code: string;
  custom_domain: string | null;
  title: string | null;
  description: string | null;
  is_active: boolean;
  expires_at: string | null;
  click_count: number;
  created_at: string;
  updated_at: string;
}

const app = new Hono<{ Bindings: Env }>();

// Updated CORS middleware for cookie-based authentication
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '';
  const allowedOrigins = [
    'http://localhost:3000',
    'https://your-frontend-domain.com', // Replace with your actual frontend domain
    'https://linkshort.vercel.app' // Example production domain
  ];

  // Must allow exact origin (not *) for credentials to work
  if (allowedOrigins.includes(origin)) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
    c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  }

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.body('', 204);
  }

  await next();
});

// Utility functions (keep existing ones)
function generateId(): string {
  return crypto.randomUUID();
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = await hashPassword(password);
  return hashedPassword === hash;
}

function parseUserAgent(userAgent: string) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  
  return {
    device_type: result.device.type || 'desktop',
    browser: result.browser.name || 'unknown',
    os: result.os.name || 'unknown'
  };
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; URL-Shortener-Bot/1.0)',
      },
    });
    
    if (!response.ok) return null;
    
    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    return titleMatch ? titleMatch[1].trim() : null;
  } catch {
    return null;
  }
}

// Updated authentication middleware for cookie-based auth
const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token');
  
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verify(token, c.env.JWT_SECRET);
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

// Updated Auth routes for cookie-based authentication
app.post('/api/auth/register', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
      return c.json({ error: 'User already exists' }, 409);
    }

    // Create user
    const userId = generateId();
    const passwordHash = await hashPassword(password);

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, tier)
      VALUES (?, ?, ?, ?, 'free')
    `).bind(userId, email, name || null, passwordHash).run();

    // Generate JWT and set as HttpOnly cookie
    const token = await sign(
      { userId, email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, // 7 days
      c.env.JWT_SECRET
    );

    // Set HttpOnly cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'None', // Required for cross-domain
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return c.json({
      user: { id: userId, email, name, tier: 'free' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).bind(email).first() as any;

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT and set as HttpOnly cookie
    const token = await sign(
      { userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
      c.env.JWT_SECRET
    );

    // Set HttpOnly cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
 
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// New logout route
app.post('/api/auth/logout', async (c) => {
  // Clear the auth cookie
  setCookie(c, 'auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 0, // Expire immediately
  });

  return c.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, tier, created_at FROM users WHERE id = ?'
    ).bind(payload.userId).first() as User;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });

  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user profile
app.put('/api/auth/update-profile', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const { name, email, bio } = await c.req.json();

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return c.json({ error: 'Invalid email format' }, 400);
      }

      // Check if email is already taken by another user
      const existingUser = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ? AND id != ?'
      ).bind(email, payload.userId).first();

      if (existingUser) {
        return c.json({ error: 'Email already exists' }, 409);
      }
    }

    // Update user profile
    const result = await c.env.DB.prepare(`
      UPDATE users 
      SET name = ?, email = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      name || null,
      email || null,
      new Date().toISOString(),
      payload.userId
    ).run();

    if (!result.success) {
      return c.json({ error: 'Failed to update profile' }, 500);
    }

    // Get updated user
    const updatedUser = await c.env.DB.prepare(
      'SELECT id, email, name, tier, created_at FROM users WHERE id = ?'
    ).bind(payload.userId).first() as User;

    return c.json({ 
      message: 'Profile updated successfully',
      user: updatedUser 
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update user password
app.put('/api/auth/update-password', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Current password and new password are required' }, 400);
    }

    if (newPassword.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Get current user to verify current password
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(payload.userId).first() as any;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Verify current password
    if (!(await verifyPassword(currentPassword, user.password_hash))) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    const result = await c.env.DB.prepare(`
      UPDATE users 
      SET password_hash = ?, updated_at = ?
      WHERE id = ?
    `).bind(
      newPasswordHash,
      new Date().toISOString(),
      payload.userId
    ).run();

    if (!result.success) {
      return c.json({ error: 'Failed to update password' }, 500);
    }

    return c.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Update password error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Link routes
app.post('/api/links', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const { originalUrl, customCode, title, expiresAt } = await c.req.json();

    if (!originalUrl) {
      return c.json({ error: 'Original URL is required' }, 400);
    }

    // Validate URL
    try {
      new URL(originalUrl);
    } catch {
      return c.json({ error: 'Invalid URL format' }, 400);
    }

    // Get user to check tier
    const user = await c.env.DB.prepare(
      'SELECT tier FROM users WHERE id = ?'
    ).bind(payload.userId).first() as { tier: string };

    // Check if custom code is allowed
    if (customCode && user.tier === 'free') {
      return c.json({ error: 'Custom codes require Pro or Premium plan' }, 403);
    }

    // Generate short code
    let shortCode = customCode || generateShortCode();
    
    // Check if short code already exists
    let attempts = 0;
    while (attempts < 5) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM links WHERE short_code = ?'
      ).bind(shortCode).first();
      
      if (!existing) break;
      
      if (customCode) {
        return c.json({ error: 'Custom short code already exists' }, 409);
      }
      
      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= 5) {
      return c.json({ error: 'Unable to generate unique short code' }, 500);
    }

    // Fetch page title if not provided
    let pageTitle = title;
    if (!pageTitle) {
      pageTitle = await fetchPageTitle(originalUrl);
    }

    // Create link
    const linkId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO links (id, user_id, original_url, short_code, title, is_active, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, true, ?, ?, ?)
    `).bind(
      linkId,
      payload.userId,
      originalUrl,
      shortCode,
      pageTitle,
      expiresAt || null,
      now,
      now
    ).run();

    return c.json({
      id: linkId,
      shortCode,
      originalUrl,
      title: pageTitle,
      clickCount: 0,
      createdAt: now,
      isActive: true
    });

  } catch (error) {
    console.error('Create link error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/links', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    const links = await c.env.DB.prepare(`
      SELECT * FROM links 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).bind(payload.userId, limit, offset).all();

    return c.json({
      links: links.results.map((link: any) => ({
        id: link.id,
        shortCode: link.short_code,
        originalUrl: link.original_url,
        title: link.title,
        clickCount: link.click_count,
        createdAt: link.created_at,
        isActive: link.is_active,
        expiresAt: link.expires_at
      }))
    });

  } catch (error) {
    console.error('Get links error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/links/:id', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const linkId = c.req.param('id');

    const link = await c.env.DB.prepare(
      'SELECT * FROM links WHERE id = ? AND user_id = ?'
    ).bind(linkId, payload.userId).first() as any;

    if (!link) {
      return c.json({ error: 'Link not found' }, 404);
    }

    return c.json({
      id: link.id,
      shortCode: link.short_code,
      originalUrl: link.original_url,
      title: link.title,
      clickCount: link.click_count,
      createdAt: link.created_at,
      isActive: link.is_active,
      expiresAt: link.expires_at
    });

  } catch (error) {
    console.error('Get link error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.put('/api/links/:id', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const linkId = c.req.param('id');
    const { title, isActive, expiresAt } = await c.req.json();

    const result = await c.env.DB.prepare(`
      UPDATE links 
      SET title = ?, is_active = ?, expires_at = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      title,
      isActive,
      expiresAt || null,
      new Date().toISOString(),
      linkId,
      payload.userId
    ).run();

    // D1Result does not have a 'changes' property, so check the number of affected rows via 'success' or 'meta'
    // See: https://developers.cloudflare.com/d1/platform/client-api/#d1result
    if (!result.success || (result.meta && result.meta.changes === 0)) {
      return c.json({ error: 'Link not found' }, 404);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Update link error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.delete('/api/links/:id', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const linkId = c.req.param('id');

    const result = await c.env.DB.prepare(
      'DELETE FROM links WHERE id = ? AND user_id = ?'
    ).bind(linkId, payload.userId).run();

    if (!result.success || (result.meta && result.meta.changes === 0)) {
      return c.json({ error: 'Link not found' }, 404);
    }

    return c.json({ success: true });

  } catch (error) {
    console.error('Delete link error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Analytics routes
app.get('/api/links/:id/analytics', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const linkId = c.req.param('id');
    const days = parseInt(c.req.query('days') || '30');

    // Verify link ownership
    const link = await c.env.DB.prepare(
      'SELECT id FROM links WHERE id = ? AND user_id = ?'
    ).bind(linkId, payload.userId).first();

    if (!link) {
      return c.json({ error: 'Link not found' }, 404);
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get analytics data
    const analytics = await c.env.DB.prepare(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as clicks,
        country,
        device_type,
        browser,
        referer
      FROM analytics_events 
      WHERE link_id = ? AND timestamp >= ?
      GROUP BY DATE(timestamp), country, device_type, browser, referer
      ORDER BY timestamp DESC
    `).bind(linkId, startDate.toISOString()).all();

    // Process analytics data
    const clicksByDate: { [key: string]: number } = {};
    const clicksByCountry: { [key: string]: number } = {};
    const clicksByDevice: { [key: string]: number } = {};
    const clicksByBrowser: { [key: string]: number } = {};
    const clicksByReferrer: { [key: string]: number } = {};

    analytics.results.forEach((row: any) => {
      clicksByDate[row.date] = (clicksByDate[row.date] || 0) + row.clicks;
      if (row.country) clicksByCountry[row.country] = (clicksByCountry[row.country] || 0) + row.clicks;
      if (row.device_type) clicksByDevice[row.device_type] = (clicksByDevice[row.device_type] || 0) + row.clicks;
      if (row.browser) clicksByBrowser[row.browser] = (clicksByBrowser[row.browser] || 0) + row.clicks;
      if (row.referer) clicksByReferrer[row.referer] = (clicksByReferrer[row.referer] || 0) + row.clicks;
    });

    return c.json({
      clicksByDate,
      clicksByCountry,
      clicksByDevice,
      clicksByBrowser,
      clicksByReferrer,
      totalClicks: Object.values(clicksByDate).reduce((sum, clicks) => sum + clicks, 0)
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Redirect route
app.get('/:shortCode', async (c) => {
  try {
    const shortCode = c.req.param('shortCode');

    // Find the link
    const link = await c.env.DB.prepare(
      'SELECT * FROM links WHERE short_code = ? AND is_active = true'
    ).bind(shortCode).first() as any;

    if (!link) {
      return c.redirect('https://your-frontend-domain.com/404');
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return c.redirect('https://your-frontend-domain.com/expired');
    }

    // Track analytics
    const userAgent = c.req.header('user-agent') || '';
    const referer = c.req.header('referer') || '';
    const ip = c.req.header('cf-connecting-ip') || '';
    const country = c.req.header('cf-ipcountry') || '';
    const city = c.req.header('cf-ipcity') || '';

    const { device_type, browser, os } = parseUserAgent(userAgent);

    // Create analytics event
    await c.env.DB.prepare(`
      INSERT INTO analytics_events (id, link_id, ip_address, user_agent, referer, country, city, device_type, browser, os)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      link.id,
      ip,
      userAgent,
      referer,
      country,
      city,
      device_type,
      browser,
      os
    ).run();

    // Increment click count
    await c.env.DB.prepare(
      'UPDATE links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(link.id).run();

    // Redirect to original URL
    return c.redirect(link.original_url);

  } catch (error) {
    console.error('Redirect error:', error);
    return c.redirect('https://your-frontend-domain.com/error');
  }
});

// Custom domains routes (Premium feature)
app.post('/api/domains', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const { domain } = await c.req.json();

    // Check user tier
    const user = await c.env.DB.prepare(
      'SELECT tier FROM users WHERE id = ?'
    ).bind(payload.userId).first() as { tier: string };

    if (user.tier !== 'premium') {
      return c.json({ error: 'Custom domains require Premium plan' }, 403);
    }

    // Check if domain already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM custom_domains WHERE domain = ?'
    ).bind(domain).first();

    if (existing) {
      return c.json({ error: 'Domain already exists' }, 409);
    }

    // Create domain
    const domainId = generateId();
    const verificationToken = generateId();

    await c.env.DB.prepare(`
      INSERT INTO custom_domains (id, user_id, domain, verification_token)
      VALUES (?, ?, ?, ?)
    `).bind(domainId, payload.userId, domain, verificationToken).run();

    return c.json({
      id: domainId,
      domain,
      isVerified: false,
      verificationToken
    });

  } catch (error) {
    console.error('Create domain error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/domains', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');

    const domains = await c.env.DB.prepare(
      'SELECT * FROM custom_domains WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(payload.userId).all();

    return c.json({
      domains: domains.results.map((domain: any) => ({
        id: domain.id,
        domain: domain.domain,
        isVerified: domain.is_verified,
        verificationToken: domain.verification_token,
        createdAt: domain.created_at
      }))
    });

  } catch (error) {
    console.error('Get domains error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
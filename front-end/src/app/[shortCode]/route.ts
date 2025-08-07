import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { generateId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { shortCode } = params;
    const db = new DatabaseService(global.DB);

    // Find the link
    const link = await db.getLinkByShortCode(shortCode);

    if (!link) {
      return NextResponse.redirect(new URL('/404', request.url));
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/expired', request.url));
    }

    // Track analytics
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '';

    // Create analytics event
    await db.createAnalyticsEvent({
      id: generateId(),
      link_id: link.id,
      ip_address: ip,
      user_agent: userAgent,
      referer: referer,
      country: null, // Would be populated by Cloudflare Workers
      city: null,    // Would be populated by Cloudflare Workers
    });

    // Increment click count
    await db.incrementClickCount(link.id);

    // Redirect to original URL
    return NextResponse.redirect(link.original_url);

  } catch (error) {
    console.error('Error handling redirect:', error);
    return NextResponse.redirect(new URL('/error', request.url));
  }
}

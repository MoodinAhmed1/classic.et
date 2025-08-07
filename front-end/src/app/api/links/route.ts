import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/db';
import { generateId, generateShortCode, isValidUrl, fetchPageTitle } from '@/lib/utils';

// This would be injected by Cloudflare Workers in production
declare global {
  var DB: any;
}

export async function POST(request: NextRequest) {
  try {
    const { originalUrl, customCode, title } = await request.json();

    // Validate URL
    if (!originalUrl || !isValidUrl(originalUrl)) {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 }
      );
    }

    // For now, we'll use a mock user ID
    // In production, this would come from authentication
    const userId = 'mock-user-id';

    const db = new DatabaseService(global.DB);

    // Generate short code
    let shortCode = customCode || generateShortCode();
    
    // Check if short code already exists
    let attempts = 0;
    while (attempts < 5) {
      const existing = await db.getLinkByShortCode(shortCode);
      if (!existing) break;
      
      if (customCode) {
        return NextResponse.json(
          { error: 'Custom short code already exists' },
          { status: 409 }
        );
      }
      
      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'Unable to generate unique short code' },
        { status: 500 }
      );
    }

    // Fetch page title if not provided
    let pageTitle = title;
    if (!pageTitle) {
      pageTitle = await fetchPageTitle(originalUrl);
    }

    // Create link
    const link = await db.createLink({
      id: generateId(),
      user_id: userId,
      original_url: originalUrl,
      short_code: shortCode,
      custom_domain: null,
      title: pageTitle,
      description: null,
      is_active: true,
      expires_at: null,
    });

    return NextResponse.json({
      id: link.id,
      shortCode: link.short_code,
      originalUrl: link.original_url,
      shortUrl: `${request.nextUrl.origin}/${link.short_code}`,
      title: link.title,
      clickCount: link.click_count,
      createdAt: link.created_at,
    });

  } catch (error) {
    console.error('Error creating link:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a mock user ID
    const userId = 'mock-user-id';
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = new DatabaseService(global.DB);
    const links = await db.getUserLinks(userId, limit, offset);

    const formattedLinks = links.map((link: { id: any; short_code: any; original_url: any; title: any; click_count: any; created_at: any; is_active: any; }) => ({
      id: link.id,
      shortCode: link.short_code,
      originalUrl: link.original_url,
      shortUrl: `${request.nextUrl.origin}/${link.short_code}`,
      title: link.title,
      clickCount: link.click_count,
      createdAt: link.created_at,
      isActive: link.is_active,
    }));

    return NextResponse.json({ links: formattedLinks });

  } catch (error) {
    console.error('Error fetching links:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

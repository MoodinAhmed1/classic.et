export interface Database {
  prepare(query: string): {
    bind(...params: any[]): {
      first(): Promise<any>;
      all(): Promise<{ results: any[] }>;
      run(): Promise<{ success: boolean; meta: any }>;
    };
  };
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  tier: 'free' | 'pro' | 'premium';
  created_at: string;
  updated_at: string;
}

export interface Link {
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

export interface AnalyticsEvent {
  id: string;
  link_id: string;
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  referer: string | null;
  country: string | null;
}

// Database operations
export class DatabaseService {
  constructor(private db: Database) {}

  // User operations
  async createUser(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        INSERT INTO users (id, email, name, tier, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        RETURNING *
      `)
      .bind(user.id, user.email, user.name, user.tier, now, now)
      .first();
    
    return result as User;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first();
    
    return result as User | null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();
    
    return result as User | null;
  }

  // Link operations
  async createLink(link: Omit<Link, 'created_at' | 'updated_at' | 'click_count'>): Promise<Link> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`
        INSERT INTO links (id, user_id, original_url, short_code, custom_domain, title, description, is_active, expires_at, click_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        RETURNING *
      `)
      .bind(
        link.id,
        link.user_id,
        link.original_url,
        link.short_code,
        link.custom_domain,
        link.title,
        link.description,
        link.is_active,
        link.expires_at,
        now,
        now
      )
      .first();
    
    return result as Link;
  }

  async getLinkByShortCode(shortCode: string): Promise<Link | null> {
    const result = await this.db
      .prepare('SELECT * FROM links WHERE short_code = ? AND is_active = true')
      .bind(shortCode)
      .first();
    
    return result as Link | null;
  }

  async getUserLinks(userId: string, limit = 50, offset = 0): Promise<Link[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM links 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `)
      .bind(userId, limit, offset)
      .all();
    
    return result.results as Link[];
  }

  async incrementClickCount(linkId: string): Promise<void> {
    await this.db
      .prepare('UPDATE links SET click_count = click_count + 1 WHERE id = ?')
      .bind(linkId)
      .run();
  }

  // Analytics operations
  async createAnalyticsEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    const now = new Date().toISOString();
    await this.db
      .prepare(`
        INSERT INTO analytics_events (id, link_id, timestamp, ip_address, user_agent, referer, country)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        event.id,
        event.link_id,
        now,
        event.ip_address,
        event.user_agent,
        event.referer,
        event.country
      )
      .run();
  }
}

// Backend implementation for Hono with cookie-based authentication
// This should be applied to your existing index.ts file

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign, verify } from 'hono/jwt';
import { setCookie, getCookie } from 'hono/cookie';
import { UAParser } from 'ua-parser-js';
import { 
  checkUsageLimit, 
  incrementUsage, 
  getUserUsageSummary, 
  getSubscriptionPlan,
  hasFeatureAccess,
  getAnalyticsRetentionDays,
  checkVisitorCap,
  trackNewVisitor,
  canSeeFullAnalytics,
  canSeeAdvancedCharts,
  canDownloadPDF,
  updateLastVisit
} from './subscription-utils';
import { ChapaService, ChapaWebhookHandler } from './chapa-integration';

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  FRONTEND_URL: string;
  FROM_EMAIL: string; // Optional, can be set to a verified domain email
  CHAPA_SECRET_KEY: string;
  CHAPA_PUBLIC_KEY: string;
  CHAPA_ENCRYPTION_KEY: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  subscription_status: 'active' | 'canceled' | 'past_due' | 'unpaid';
  subscription_id?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
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
    return c.body(null, 204);
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

function generateResetToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}


function generateVerificationCode(): string {
// Generate a 6-digit verification code
return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendPasswordResetEmail(
  email: string, 
  resetToken: string, 
  frontendUrl: string, 
  resendApiKey: string, 
  userName?: string
) {
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  // Use a verified sender domain - IMPORTANT: Replace with your verified domain
  const fromEmail = 'onboarding@resend.dev'; // This is Resend's test domain
  // For production, use: 'noreply@yourdomain.com' (must be verified in Resend)
  
  const emailData = {
    from: `LinkShort <${fromEmail}>`,
    to: [email],
    subject: 'Reset Your LinkShort Password',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - LinkShort</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 16px;
          }
          
          .header-title {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            opacity: 0.95;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          .cta-container {
            text-align: center;
            margin: 40px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          
          .cta-button:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
          
          .backup-link {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            word-break: break-all;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            color: #475569;
          }
          
          .warning-box {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          
          .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .warning-list {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            padding-left: 20px;
          }
          
          .warning-list li {
            margin: 6px 0;
          }
          
          .security-tips {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            border-left: 4px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          
          .security-title {
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .security-list {
            color: #1e40af;
            font-size: 14px;
            margin: 0;
            padding-left: 20px;
          }
          
          .security-list li {
            margin: 6px 0;
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          
          .footer-brand {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .footer-note {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
            line-height: 1.5;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e2e8f0, transparent);
            margin: 32px 0;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .logo {
              font-size: 24px;
            }
            
            .header-title {
              font-size: 20px;
            }
            
            .cta-button {
              padding: 14px 24px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">
              ⚡ LinkShort
            </div>
            <h1 class="header-title">Password Reset Request</h1>
          </div>
          
          <div class="content">
            <div class="greeting">Hi ${userName || 'there'}!</div>
            
            <div class="message">
              You recently requested to reset your password for your LinkShort account. We're here to help you regain access to your account quickly and securely.
            </div>
            
            <div class="cta-container">
              <a href="${resetUrl}" class="cta-button">Reset Your Password</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            
            <div class="backup-link">
              ${resetUrl}
            </div>
            
            <div class="warning-box">
              <div class="warning-title">
                🔒 Important Security Information
              </div>
              <ul class="warning-list">
                <li>This reset link will expire in <strong>1 hour</strong> for your security</li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Never share this link with anyone - it's personal and secure</li>
                <li>This link can only be used once</li>
                <li>Our team will never ask for your password via email</li>
              </ul>
            </div>
            
            <div class="divider"></div>
            
            <div class="security-tips">
              <div class="security-title">
                💡 Password Security Best Practices
              </div>
              <ul class="security-list">
                <li>Use at least 8 characters with a mix of letters, numbers, and symbols</li>
                <li>Avoid using personal information like names, birthdays, or addresses</li>
                <li>Don't reuse passwords from other websites or services</li>
                <li>Consider using a password manager to generate and store secure passwords</li>
                <li>Enable two-factor authentication when available for extra security</li>
                <li>Update your passwords regularly, especially for important accounts</li>
              </ul>
            </div>
            
            <div class="message" style="margin-top: 32px;">
              If you have any questions or concerns about your account security, please don't hesitate to contact our support team. We're here to help keep your account safe and secure.
            </div>
            
            <p style="margin-top: 32px; color: #374151;">
              Best regards,<br>
              <strong>The LinkShort Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-brand">LinkShort</div>
            <div>This email was sent to <strong>${email}</strong></div>
            <div style="margin: 8px 0;">© 2024 LinkShort. All rights reserved.</div>
            <div class="footer-note">
              This is an automated message. Please do not reply to this email. If you're having trouble with the reset button, copy and paste the URL into your web browser.
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Hi ${userName || 'there'}!

      You recently requested to reset your password for your LinkShort account.

      To reset your password, click the following link:
      ${resetUrl}

      IMPORTANT SECURITY INFORMATION:
      - This link will expire in 1 hour for your security
      - If you didn't request this password reset, please ignore this email
      - Never share this link with anyone
      - This link can only be used once
      - Our team will never ask for your password via email

      PASSWORD SECURITY BEST PRACTICES:
      - Use at least 8 characters with a mix of letters, numbers, and symbols
      - Avoid using personal information like names, birthdays, or addresses
      - Don't reuse passwords from other websites or services
      - Consider using a password manager to generate and store secure passwords
      - Enable two-factor authentication when available for extra security
      - Update your passwords regularly, especially for important accounts

      If you have any questions or concerns about your account security, please contact our support team.

      Best regards,
      The LinkShort Team

      This email was sent to ${email}
      © 2024 LinkShort. All rights reserved.

      This is an automated message. Please do not reply to this email.
    `
  };

  console.log('Email data prepared:', {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    htmlLength: emailData.html.length,
    textLength: emailData.text.length
  });

  try {
    console.log('Making request to Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log('Resend API response status:', response.status);
    console.log('Resend API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Resend API response body:', responseText);

    if (!response.ok) {
      console.error('Resend API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      
      let errorMessage = `Resend API Error: ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Response is not JSON, use the text
        errorMessage = responseText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Resend response as JSON:', responseText);
      throw new Error('Invalid response from email service');
    }    
    return { success: true, id: result.id };
  } catch (error) {
    throw error;
  }
}

// async function sendEmailVerification(
//   email: string, 
//   verificationToken: string,
//   frontendUrl: string,
//   resendApiKey: string
// ) {
//   const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

//   const fromEmail = 'onboarding@resend.dev';

//   const emailData = {
//     from: `LinkShort <${fromEmail}>`,
//     to: [email],
//     subject: 'Verify Your LinkShort Email',
//     html: `
//       <!DOCTYPE html>
//       <html lang="en">
//       <head>
//         <meta charset="utf-8">
//         <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         <title>Verify Your Email - LinkShort</title>
//         <style>
//           body {
//             font-family: Arial, sans-serif;
//             background-color: #f4f4f4;
//             color: #333;
//             padding: 20px;
//           }
//           .email-container {
//             max-width: 600px;
//             margin: 0 auto;
//             background: #fff;
//             padding: 20px;
//             border-radius: 8px;
//             box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
//           }
//           .header {
//             background: #4a90e2;
//             color: #fff;
//             padding: 20px;
//             text-align: center;
//             border-radius: 8px 8px 0 0;
//           }
//           .header h1 {
//             margin: 0;
//             font-size: 24px;
//           }
//           .content {
//             padding: 20px;
//           }
//           .content p {
//             font-size: 16px;
//             line-height: 1.5;
//           }
//           .cta-button {
//             display: inline-block;
//             background: #4a90e2;
//             color: #fff;
//             padding: 10px 20px;
//             text-decoration: none;
//             border-radius: 5px;
//             margin-top: 20px;
//           }
//           .footer {
//             margin-top: 20px;
//             font-size: 12px;
//             color: #999;
//             text-align: center;
//           }
//           .footer a {
//             color: #4a90e2;
//             text-decoration: none;
//           }
//           .footer a:hover {
//             text-decoration: underline;
//           }
//         </style>
//       </head>
//       <body>
//         <div class="email-container">
//           <div class="header">
//             <h1>Verify Your Email</h1>
//           </div>
//           <div class="content">
//             <p>Hi there!</p>
//             <p>Thank you for registering with LinkShort. To complete your registration, please verify your email address by clicking the button below:</p>
//             <a href="${verificationUrl}" class="cta-button">Verify Email</a>
//             <p>If the button above doesn't work, copy and paste this link into your browser:</p>
//             <p><a href="${verificationUrl}">${verificationUrl}</a></p>
//             <p>If you did not create an account, you can safely ignore this email.</p>
//             <p>Thank you for choosing LinkShort!</p>
//           </div>
//           <div class="footer">
//             <p>&copy; 2024 LinkShort. All rights reserved.</p>
//             <p><a href="${frontendUrl}">Visit our website</a></p>
//           </div>
//         </div>
//       </body>
//       </html>
//     `,
//     text: `
//       Hi there!

//       Thank you for registering with LinkShort. To complete your registration, please verify your email address by clicking the link below:

//       ${verificationUrl}

//       If you did not create an account, you can safely ignore this email.

//       Thank you for choosing LinkShort!

//       © 2024 LinkShort. All rights reserved.
//       Visit our website: ${frontendUrl}
//     `
//   };
//   try {
//     const response = await fetch('https://api.resend.com/emails', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${resendApiKey}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(emailData)
//     });
//     if (!response.ok) {
//       const errorData = await response.json();
//       throw new Error(`Failed to send verification email: ${errorData.error || 'Unknown error'}`);
//     }
//     const result: any = await response.json();
//     if(result){
//       return { success: true, id: result.id };
//     }
//   } catch (error) {
//     throw new Error(`Failed to send verification email: ${error.message}`);
//   }
// }

async function sendVerificationEmail(
  email: string, 
  verificationCode: string, 
  frontendUrl: string, 
  resendApiKey: string, 
  fromEmail?: string,
  userName?: string
) {
  console.log('=== VERIFICATION EMAIL SENDING DEBUG ===');
  console.log('Email:', email);
  console.log('Verification code:', verificationCode);
  console.log('Frontend URL:', frontendUrl);
  console.log('API Key present:', !!resendApiKey);
  console.log('From email:', fromEmail);
  console.log('User name:', userName);

  const verificationUrl = `${frontendUrl}/verify-email?code=${verificationCode}&email=${encodeURIComponent(email)}`;
  console.log('Verification URL:', verificationUrl);
  
  // Determine sender email based on domain verification status
  let senderEmail: string;
  let senderName = 'LinkShort';
  
  if (fromEmail) {
    // Use custom verified domain email
    senderEmail = fromEmail;
    console.log('Using custom verified sender email:', senderEmail);
  } else {
    // Use Resend's test domain (only works for sending to your own email)
    senderEmail = 'onboarding@resend.dev';
    console.log('Using Resend test domain (limited to your own email):', senderEmail);
  }
  
  const emailData = {
    from: `${senderName} <${senderEmail}>`,
    to: [email],
    subject: 'Verify Your LinkShort Account - Welcome!',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - LinkShort</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333333;
            background-color: #f8fafc;
            padding: 20px;
          }
          
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          }
          
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
          }
          
          .logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 16px;
          }
          
          .header-title {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            opacity: 0.95;
          }
          
          .content {
            padding: 40px 30px;
          }
          
          .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 20px;
          }
          
          .message {
            font-size: 16px;
            color: #4b5563;
            margin-bottom: 32px;
            line-height: 1.7;
          }
          
          .verification-code-container {
            text-align: center;
            margin: 40px 0;
            padding: 30px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            border-radius: 16px;
            border: 2px solid #0ea5e9;
          }
          
          .verification-code-label {
            font-size: 14px;
            font-weight: 600;
            color: #0c4a6e;
            margin-bottom: 16px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .verification-code {
            font-size: 36px;
            font-weight: bold;
            color: #0369a1;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            letter-spacing: 8px;
            margin: 16px 0;
            padding: 16px 24px;
            background: white;
            border-radius: 12px;
            border: 2px solid #0ea5e9;
            display: inline-block;
            box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
          }
          
          .verification-note {
            font-size: 14px;
            color: #0c4a6e;
            margin-top: 16px;
          }
          
          .cta-container {
            text-align: center;
            margin: 40px 0;
          }
          
          .cta-button {
            display: inline-block;
            background: #3b82f6;
            color: white !important;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          }
          
          .cta-button:hover {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
          }
          
          .backup-link {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
            word-break: break-all;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            color: #475569;
          }
          
          .info-box {
            background: #f0fdf4;
            border: 1px solid #22c55e;
            border-left: 4px solid #22c55e;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          
          .info-title {
            font-weight: 600;
            color: #15803d;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .info-list {
            color: #15803d;
            font-size: 14px;
            margin: 0;
            padding-left: 20px;
          }
          
          .info-list li {
            margin: 6px 0;
          }
          
          .warning-box {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
          }
          
          .warning-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .warning-list {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            padding-left: 20px;
          }
          
          .warning-list li {
            margin: 6px 0;
          }
          
          .footer {
            background: #f8fafc;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          
          .footer-brand {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }
          
          .footer-note {
            font-size: 12px;
            color: #94a3b8;
            margin-top: 16px;
            line-height: 1.5;
          }
          
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #e2e8f0, transparent);
            margin: 32px 0;
          }
          
          .domain-notice {
            background: #f0f9ff;
            border: 1px solid #0ea5e9;
            border-left: 4px solid #0ea5e9;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            font-size: 13px;
            color: #0c4a6e;
          }
          
          @media (max-width: 600px) {
            body {
              padding: 10px;
            }
            
            .content {
              padding: 30px 20px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .logo {
              font-size: 24px;
            }
            
            .header-title {
              font-size: 20px;
            }
            
            .verification-code {
              font-size: 28px;
              letter-spacing: 4px;
              padding: 12px 16px;
            }
            
            .cta-button {
              padding: 14px 24px;
              font-size: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="header">
            <div class="logo">
              ⚡ LinkShort
            </div>
            <h1 class="header-title">Welcome to LinkShort!</h1>
          </div>
          
          <div class="content">
            <div class="greeting">Hi ${userName || 'there'}!</div>
            
            <div class="message">
              Thank you for signing up for LinkShort! We're excited to have you on board. To complete your registration and start shortening URLs, please verify your email address using the verification code below.
            </div>
            
            <div class="verification-code-container">
              <div class="verification-code-label">Your Verification Code</div>
              <div class="verification-code">${verificationCode}</div>
              <div class="verification-note">
                Enter this 6-digit code in the verification form to activate your account.
              </div>
            </div>
            
            <div class="message">
              You can also click the button below to verify your email automatically:
            </div>
            
            <div class="cta-container">
              <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; text-align: center; margin-bottom: 24px;">
              If the button above doesn't work, copy and paste this link into your browser:
            </p>
            
            <div class="backup-link">
              ${verificationUrl}
            </div>
            
            ${!fromEmail ? `
            <div class="domain-notice">
              <strong>📧 Email Delivery Notice:</strong> This email was sent using Resend's test domain. 
              For production use, the sender should verify a custom domain at resend.com/domains to ensure 
              reliable delivery to all recipients.
            </div>
            ` : ''}
            
            <div class="info-box">
              <div class="info-title">
                🎉 What's Next?
              </div>
              <ul class="info-list">
                <li>Verify your email using the code above</li>
                <li>Start creating short links for your URLs</li>
                <li>Track clicks and analytics for your links</li>
                <li>Customize your links with custom codes</li>
                <li>Manage all your links from the dashboard</li>
              </ul>
            </div>
            
            <div class="warning-box">
              <div class="warning-title">
                🔒 Important Security Information
              </div>
              <ul class="warning-list">
                <li>This verification code will expire in <strong>15 minutes</strong> for security</li>
                <li>If you didn't create this account, please ignore this email</li>
                <li>Never share this verification code with anyone</li>
                <li>This code can only be used once</li>
                <li>Our team will never ask for your verification code via email or phone</li>
              </ul>
            </div>
            
            <div class="divider"></div>
            
            <div class="message" style="margin-top: 32px;">
              If you have any questions or need help getting started, please don't hesitate to contact our support team. We're here to help you make the most of LinkShort!
            </div>
            
            <p style="margin-top: 32px; color: #374151;">
              Welcome aboard!<br>
              <strong>The LinkShort Team</strong>
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-brand">LinkShort</div>
            <div>This email was sent to <strong>${email}</strong></div>
            <div style="margin: 8px 0;">© 2024 LinkShort. All rights reserved.</div>
            <div class="footer-note">
              This is an automated message. Please do not reply to this email. If you're having trouble with the verification button, copy and paste the URL into your web browser.
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Welcome to LinkShort!

Hi ${userName || 'there'}!

Thank you for signing up for LinkShort! We're excited to have you on board. To complete your registration and start shortening URLs, please verify your email address using the verification code below.

YOUR VERIFICATION CODE: ${verificationCode}

Enter this 6-digit code in the verification form to activate your account.

You can also verify your email by visiting this link:
${verificationUrl}

${!fromEmail ? `
EMAIL DELIVERY NOTICE: This email was sent using Resend's test domain. For production use, the sender should verify a custom domain at resend.com/domains to ensure reliable delivery to all recipients.
` : ''}

WHAT'S NEXT:
- Verify your email using the code above
- Start creating short links for your URLs
- Track clicks and analytics for your links
- Customize your links with custom codes
- Manage all your links from the dashboard

IMPORTANT SECURITY INFORMATION:
- This verification code will expire in 15 minutes for security
- If you didn't create this account, please ignore this email
- Never share this verification code with anyone
- This code can only be used once
- Our team will never ask for your verification code via email or phone

If you have any questions or need help getting started, please contact our support team.

Welcome aboard!
The LinkShort Team

This email was sent to ${email}
© 2024 LinkShort. All rights reserved.

This is an automated message. Please do not reply to this email.
    `
  };

  console.log('Email data prepared:', {
    from: emailData.from,
    to: emailData.to,
    subject: emailData.subject,
    htmlLength: emailData.html.length,
    textLength: emailData.text.length
  });

  try {
    console.log('Making request to Resend API...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    console.log('Resend API response status:', response.status);
    console.log('Resend API response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Resend API response body:', responseText);

    if (!response.ok) {
      console.error('Resend API Error Details:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      
      let errorMessage = `Resend API Error: ${response.status}`;
      let errorDetails = '';
      
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Handle specific domain verification errors
        if (errorData.message && errorData.message.includes('domain')) {
          errorDetails = 'Domain verification required. Please verify your domain at resend.com/domains';
        }
      } catch (e) {
        // Response is not JSON, use the text
        errorMessage = responseText || errorMessage;
      }
      
      throw new Error(`${errorMessage}${errorDetails ? ` - ${errorDetails}` : ''}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Resend response as JSON:', responseText);
      throw new Error('Invalid response from email service');
    }

    console.log('Verification email sent successfully!');
    console.log('Email ID:', result.id);
    console.log('Full Resend response:', result);
    
    return { success: true, id: result.id, senderEmail };
  } catch (error) {
    console.error('=== EMAIL SENDING ERROR ===');
    if (error instanceof Error) {
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error type:', typeof error);
      console.error('Error:', error);
    }
    throw error;
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
      INSERT INTO users (id, email, name, password_hash, tier, email_verified)
      VALUES (?, ?, ?, ?, 'free', 0)
    `).bind(userId, email, name || null, passwordHash).run();

    // Generate verification code and send email
    const verificationCode = generateVerificationCode();
    const frontendUrl = c.env.FRONTEND_URL || 'http://localhost:3000';
    const resendApiKey = c.env.RESEND_API_KEY;

    if (!resendApiKey) {
      return c.json({ error: 'Email service not configured' }, 500);
    }

    try {
      const emailResult = await sendVerificationEmail(
        email, 
        verificationCode, 
        frontendUrl, 
        resendApiKey, 
        c.env.FROM_EMAIL,
        name
      );

      if (!emailResult.success) {
        return c.json({ error: 'Failed to send verification email' }, 500);
      }

      // Store verification code in database
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

      await c.env.DB.prepare(`
        INSERT INTO email_verifications (user_id, code, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(userId, verificationCode, expiresAt.toISOString(), new Date().toISOString()).run();

    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      return c.json({ 
        error: 'Failed to send verification email',
        details: errorMessage 
      }, 500);
    }

    return c.json({
      success: true,
      message: 'Registration successful! Please check your email for a verification code.',
      user: { 
        id: userId, 
        email, 
        name, 
        tier: 'free',
        emailVerified: false
      },
      requiresVerification: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
  }
})

// Email verification endpoint
app.post('/api/auth/verify-email', async (c) => {
  try {
    const { email, code } = await c.req.json();

    if (!email || !code) {
      return c.json({ error: 'Email and verification code are required' }, 400);
    }

    // Find user and verification record
    const verificationRecord = await c.env.DB.prepare(`
      SELECT ev.user_id, ev.expires_at, u.email, u.name, u.tier
      FROM email_verifications ev
      JOIN users u ON ev.user_id = u.id
      WHERE u.email = ? AND ev.code = ? AND ev.expires_at > ?
    `).bind(email, code, new Date().toISOString()).first() as any;

    if (!verificationRecord) {
      return c.json({ error: 'Invalid or expired verification code' }, 400);
    }

    // Mark user as verified
    await c.env.DB.prepare(`
      UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?
    `).bind(new Date().toISOString(), verificationRecord.user_id).run();

    // Delete used verification code
    await c.env.DB.prepare(`
      DELETE FROM email_verifications WHERE user_id = ?
    `).bind(verificationRecord.user_id).run();

    // Generate JWT and set as HttpOnly cookie
    const token = await sign(
      { 
        userId: verificationRecord.user_id, 
        email: verificationRecord.email, 
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
      },
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
      success: true,
      message: 'Email verified successfully! Welcome to LinkShort.',
      user: {
        id: verificationRecord.user_id,
        email: verificationRecord.email,
        name: verificationRecord.name,
        tier: verificationRecord.tier,
        emailVerified: true
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Resend verification code endpoint
app.post('/api/auth/resend-verification', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name FROM users WHERE email = ? AND email_verified = 0'
    ).bind(email).first() as any;

    if (!user) {
      return c.json({ error: 'User not found or already verified' }, 404);
    }

    // Delete any existing verification codes
    await c.env.DB.prepare(`
      DELETE FROM email_verifications WHERE user_id = ?
    `).bind(user.id).run();

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store new verification code
    await c.env.DB.prepare(`
      INSERT INTO email_verifications (user_id, code, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, verificationCode, expiresAt.toISOString(), new Date().toISOString()).run();

    // Send verification email
    const origin = c.env.FRONTEND_URL || c.req.header('Origin') || 'http://localhost:3000';
    
    try {
      await sendVerificationEmail(
        user.email, 
        verificationCode, 
        origin, 
        c.env.RESEND_API_KEY,
        c.env.FROM_EMAIL,
        user.name
      );

      return c.json({
        success: true,
        message: 'Verification code sent! Please check your email.'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      return c.json({ 
        error: 'Failed to send verification email',
        details: errorMessage
      }, 500);
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
  }
});

app.post("/api/auth/login", async (c) => {
  try{
    const { email, password } = await c.req.json()

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400)
    }

    // Find user
    const user = (await c.env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first()) as any

    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return c.json({ error: "Invalid credentials" }, 401)
    }

    // Check if email is verified
    if (!user.email_verified) {
      const code = generateVerificationCode()
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

      try {
        // Send verification email
        await sendVerificationEmail(
          user.email, 
          code, 
          c.env.FRONTEND_URL || 'http://localhost:3000', 
          c.env.RESEND_API_KEY,
          c.env.FROM_EMAIL,
          user.name
        )

        // Insert new verification code
        await c.env.DB.prepare(`
          INSERT INTO email_verifications (user_id, code, expires_at, created_at)
          VALUES (?, ?, ?, ?)
        `)
          .bind(user.id, code, expiresAt.toISOString(), new Date().toISOString())
          .run()

        return c.json(
          {
            error: "Email not verified",
            requiresVerification: true,
            email: user.email,
          },
          403,
        )
          } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      return c.json({ 
        error: 'Failed to send verification email',
        details: errorMessage
      }, 500);
    }
    }

    // Generate JWT and set as HttpOnly cookie
    
    const token = await sign(
      { userId: user.id, email: user.email, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 },
      c.env.JWT_SECRET,
    )

    // Set HttpOnly cookie
    setCookie(c, "auth_token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        emailVerified: user.email_verified,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    return c.json({ error: "Internal server error" }, 500)
  }
})

// Enhanced forgot password endpoint with comprehensive debugging
app.post('/api/auth/forgot-password', async (c) => {
  try {
    console.log('=== FORGOT PASSWORD REQUEST START ===');
    console.log('Request method:', c.req.method);
    console.log('Request URL:', c.req.url);
    console.log('Request headers:', Object.fromEntries(c.req.raw.headers.entries()));
    
    const body = await c.req.json();
    console.log('Request body:', body);
    
    const { email } = body;

    if (!email) {
      console.log('❌ No email provided');
      return c.json({ error: 'Email is required' }, 400);
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return c.json({ error: 'Please enter a valid email address' }, 400);
    }

    console.log('✅ Email validation passed:', email);

    // Check environment variables
    console.log('Environment check:');
    console.log('- JWT_SECRET present:', !!c.env.JWT_SECRET);
    console.log('- RESEND_API_KEY present:', !!c.env.RESEND_API_KEY);
    console.log('- RESEND_API_KEY length:', c.env.RESEND_API_KEY?.length || 0);
    console.log('- DB present:', !!c.env.DB);

    if (!c.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY environment variable not set');
      return c.json({ error: 'Email service not configured' }, 500);
    }

    console.log('✅ Environment variables check passed');

    // Check if user exists
    console.log('🔍 Looking up user with email:', email);
    
    let user;
    try {
      user = await c.env.DB.prepare(
        'SELECT id, email, name FROM users WHERE email = ?'
      ).bind(email).first() as any;
      console.log('Database query result:', user ? 'User found' : 'User not found');
    } catch (dbError) {
      console.error('❌ Database error during user lookup:', dbError);
      return c.json({ error: 'Database error' }, 500);
    }

    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('⚠️ User not found, returning success anyway for security');
      return c.json({ 
        success: true, 
        message: 'If an account with that email exists, we have sent a password reset link.' 
      });
    }

    console.log('✅ User found:', { id: user.id, email: user.email, name: user.name });

    // Generate reset token
    const resetToken = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    console.log('🔑 Generated reset token:', resetToken);
    console.log('⏰ Token expires at:', expiresAt.toISOString());

    // Store reset token in database
    try {
      const dbResult = await c.env.DB.prepare(`
        INSERT OR REPLACE INTO password_resets (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(user.id, resetToken, expiresAt.toISOString(), new Date().toISOString()).run();
      
      console.log('✅ Reset token stored in database:', dbResult);
    } catch (dbError) {
      console.error('❌ Database error storing reset token:', dbError);
      return c.json({ error: 'Database error' }, 500);
    }

    // Send password reset email using Resend
    const origin = c.req.header('Origin') || 'http://localhost:3000';
    console.log('🌐 Frontend origin:', origin);
    
    try {
      console.log('📧 Attempting to send email via Resend...');
      const emailResult = await sendPasswordResetEmail(
        user.email, 
        resetToken, 
        origin, 
        c.env.RESEND_API_KEY, 
        user.name
      );
      console.log('✅ Email sent successfully:', emailResult);
    } catch (emailError) {
      console.error('❌ Failed to send password reset email:', emailError);
      const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
      const errorStack = emailError instanceof Error ? emailError.stack : undefined;
      // Return the actual error for debugging (in production, you might want to return a generic message)
      return c.json({ 
        error: `Failed to send email: ${errorMessage}`,
        details: errorStack 
      }, 500);
    }

    console.log('✅ Password reset process completed successfully');
    console.log('=== FORGOT PASSWORD REQUEST END ===');

    return c.json({ 
      success: true, 
      message: 'If an account with that email exists, we have sent a password reset link.',
      debug: {
        emailSent: true,
        resetToken: resetToken, // Remove this in production
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
      return c.json({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack 
      }, 500);
    } else {
      return c.json({ 
        error: 'Internal server error',
        details: 'Unknown error occurred'
      }, 500);
    }
  }
});

// Reset password endpoint
app.post('/api/auth/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json();

    if (!token || !password) {
      return c.json({ error: 'Token and password are required' }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }

    // Find valid reset token
    const resetRecord = await c.env.DB.prepare(`
      SELECT pr.user_id, pr.expires_at, u.email 
      FROM password_resets pr
      JOIN users u ON pr.user_id = u.id
      WHERE pr.token = ? AND pr.expires_at > ?
    `).bind(token, new Date().toISOString()).first() as any;

    if (!resetRecord) {
      return c.json({ error: 'Invalid or expired reset token' }, 400);
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user password
    await c.env.DB.prepare(`
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `).bind(passwordHash, new Date().toISOString(), resetRecord.user_id).run();

    // Delete used reset token
    await c.env.DB.prepare(`
      DELETE FROM password_resets WHERE user_id = ?
    `).bind(resetRecord.user_id).run();

    return c.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
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
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return c.json({ error: errorMessage }, 500);
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

    // Check usage limits before creating link
    const usageCheck = await checkUsageLimit(c.env.DB, payload.userId, 'create_link');
    if (!usageCheck.allowed) {
      return c.json({ 
        error: 'Link creation limit reached', 
        details: `You've created ${usageCheck.current} links this month. Your ${usageCheck.limit} limit has been reached.`,
        upgradeRequired: true,
        current: usageCheck.current,
        limit: usageCheck.limit
      }, 403);
    }

    // Check if user already has a link with the same original URL
    const existingLink = await c.env.DB.prepare(
      'SELECT id, short_code FROM links WHERE user_id = ? AND original_url = ?'
    ).bind(payload.userId, originalUrl).first();
    
    if (existingLink) {
      return c.json({ 
        error: 'Duplicate link detected', 
        details: 'You already have a link that redirects to this URL.',
        existingShortCode: existingLink.short_code
      }, 409);
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

    // Increment usage tracking
    await incrementUsage(c.env.DB, payload.userId, 'create_link');

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

    // Get user's subscription plan for retention days
    const user = await c.env.DB.prepare(`
      SELECT tier FROM users WHERE id = ?
    `).bind(payload.userId).first() as any;
    const plan = await getSubscriptionPlan(c.env.DB, user.tier);

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
      AND timestamp >= datetime('now', '-${plan?.limits.analytics_retention_days || 7} days')
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

    // Check user's analytics permissions
    const canSeeFull = await canSeeFullAnalytics(c.env.DB, payload.userId);
    const canSeeAdvanced = await canSeeAdvancedCharts(c.env.DB, payload.userId);

    // Apply restrictions based on user tier
    let restrictedCountries = clicksByCountry;
    let restrictedDevices = clicksByDevice;
    let restrictedBrowsers = clicksByBrowser;

    if (!canSeeFull) {
      // For free users, blur out top 3 countries and hide top browsers/devices
      const countryEntries = Object.entries(clicksByCountry).sort(([,a], [,b]) => b - a);
      if (countryEntries.length > 3) {
        restrictedCountries = Object.fromEntries(countryEntries.slice(3));
      } else {
        restrictedCountries = {};
      }
      
      // Completely hide browsers and devices for free users
      restrictedBrowsers = {};
      restrictedDevices = {};
    }

    return c.json({
      clicksByDate,
      clicksByCountry: restrictedCountries,
      clicksByDevice: restrictedDevices,
      clicksByBrowser: restrictedBrowsers,
      clicksByReferrer,
      totalClicks: Object.values(clicksByDate).reduce((sum, clicks) => sum + clicks, 0),
      restrictions: {
        canSeeFullAnalytics: canSeeFull,
        canSeeAdvancedCharts: canSeeAdvanced,
        topCountriesHidden: !canSeeFull && Object.keys(clicksByCountry).length > 3 ? 3 : 0,
        browsersHidden: !canSeeFull,
        devicesHidden: !canSeeFull
      }
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

    // Check visitor cap for the link owner
    const visitorCapCheck = await checkVisitorCap(c.env.DB, link.user_id);
    
    if (!visitorCapCheck.allowed) {
      // Stop tracking analytics when visitor cap is reached
      console.log(`Visitor cap reached for user ${link.user_id}: ${visitorCapCheck.current}/${visitorCapCheck.limit}`);
      
      // Still redirect but don't track analytics
      return c.redirect(link.original_url);
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

    // Track new visitor for the link owner
    await trackNewVisitor(c.env.DB, link.user_id);

    // Redirect to original URL
    return c.redirect(link.original_url);

  } catch (error) {
    console.error('Redirect error:', error);
    return c.redirect('https://your-frontend-domain.com/error');
  }
});

// Global analytics endpoint
app.get('/api/analytics/global', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const days = parseInt(c.req.query('days') || '30');

    // Update last visit time for user
    await updateLastVisit(c.env.DB, payload.userId);

    // Get user's analytics permissions
    const canSeeFull = await canSeeFullAnalytics(c.env.DB, payload.userId);
    const canSeeAdvanced = await canSeeAdvancedCharts(c.env.DB, payload.userId);

    // Get user's subscription plan for retention days
    const user = await c.env.DB.prepare(`
      SELECT tier FROM users WHERE id = ?
    `).bind(payload.userId).first() as any;
    const plan = await getSubscriptionPlan(c.env.DB, user.tier);

    // Get all user links
    const links = await c.env.DB.prepare(`
      SELECT id, short_code, title, click_count, created_at
      FROM links 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).bind(payload.userId).all();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get global analytics data
    const analytics = await c.env.DB.prepare(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as clicks,
        country,
        device_type,
        browser,
        link_id
      FROM analytics_events 
      WHERE link_id IN (${links.results.map(() => '?').join(',')}) 
      AND timestamp >= ?
      AND timestamp >= datetime('now', '-${plan?.limits.analytics_retention_days || 7} days')
      GROUP BY DATE(timestamp), country, device_type, browser, link_id
      ORDER BY timestamp DESC
    `).bind(...links.results.map((l: any) => l.id), startDate.toISOString()).all();

    // Process analytics data
    const clicksByDate: { [key: string]: number } = {};
    const clicksByCountry: { [key: string]: number } = {};
    const clicksByDevice: { [key: string]: number } = {};
    const clicksByBrowser: { [key: string]: number } = {};
    const clicksByLink: { [key: string]: number } = {};

    analytics.results.forEach((row: any) => {
      clicksByDate[row.date] = (clicksByDate[row.date] || 0) + row.clicks;
      if (row.country) clicksByCountry[row.country] = (clicksByCountry[row.country] || 0) + row.clicks;
      if (row.device_type) clicksByDevice[row.device_type] = (clicksByDevice[row.device_type] || 0) + row.clicks;
      if (row.browser) clicksByBrowser[row.browser] = (clicksByBrowser[row.browser] || 0) + row.clicks;
      if (row.link_id) clicksByLink[row.link_id] = (clicksByLink[row.link_id] || 0) + row.clicks;
    });

    // Apply restrictions based on user tier
    let restrictedCountries = clicksByCountry;
    let restrictedDevices = clicksByDevice;
    let restrictedBrowsers = clicksByBrowser;

    if (!canSeeFull) {
      // For free users, blur out top 3 countries and hide top browsers/devices
      const countryEntries = Object.entries(clicksByCountry).sort(([,a], [,b]) => b - a);
      if (countryEntries.length > 3) {
        restrictedCountries = Object.fromEntries(countryEntries.slice(3));
      } else {
        restrictedCountries = {};
      }
      
      // Completely hide browsers and devices for free users
      restrictedBrowsers = {};
      restrictedDevices = {};
    }

    // Get usage summary for visitor caps
    const usageSummary = await getUserUsageSummary(c.env.DB, payload.userId);

    return c.json({
      links: links.results.map((link: any) => ({
        id: link.id,
        shortCode: link.short_code,
        title: link.title || 'Untitled',
        clickCount: link.click_count,
        createdAt: link.created_at,
        clicksInPeriod: clicksByLink[link.id] || 0
      })),
      clicksByDate,
      clicksByCountry: restrictedCountries,
      clicksByDevice: restrictedDevices,
      clicksByBrowser: restrictedBrowsers,
      totalClicks: Object.values(clicksByDate).reduce((sum, clicks) => sum + clicks, 0),
      restrictions: {
        canSeeFullAnalytics: canSeeFull,
        canSeeAdvancedCharts: canSeeAdvanced,
        topCountriesHidden: !canSeeFull && Object.keys(clicksByCountry).length > 3 ? 3 : 0,
        browsersHidden: !canSeeFull,
        devicesHidden: !canSeeFull
      },
      usage: {
        visitorCap: usageSummary.limits.visitors,
        newVisitorsSinceLastVisit: usageSummary.newVisitorsSinceLastVisit
      }
    });

  } catch (error) {
    console.error('Get global analytics error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});



// Subscription and billing routes
app.get('/api/subscription/plans', async (c) => {
  try {
    const plans = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans ORDER BY price_monthly ASC
    `).all();

    return c.json({
      plans: plans.results.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        tier: plan.tier,
        priceMonthly: plan.price_monthly,
        priceYearly: plan.price_yearly,
        features: JSON.parse(plan.features),
        limits: JSON.parse(plan.limits)
      }))
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/subscription/usage', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const usageSummary = await getUserUsageSummary(c.env.DB, payload.userId);
    
    return c.json(usageSummary);
  } catch (error) {
    console.error('Get usage error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/subscription/current', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, tier, subscription_status, subscription_id, 
             current_period_start, current_period_end, cancel_at_period_end,
             created_at, updated_at
      FROM users WHERE id = ?
    `).bind(payload.userId).first() as any;

    const plan = await getSubscriptionPlan(c.env.DB, user.tier);
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        subscriptionStatus: user.subscription_status,
        subscriptionId: user.subscription_id,
        currentPeriodStart: user.current_period_start,
        currentPeriodEnd: user.current_period_end,
        cancelAtPeriodEnd: user.cancel_at_period_end,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      plan
    });
  } catch (error) {
    console.error('Get current subscription error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Chapa payment initialization endpoint
app.post('/api/subscription/checkout', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const { planId, billingCycle, phoneNumber } = await c.req.json();

    if (!planId || !billingCycle || !phoneNumber) {
      return c.json({ error: 'Plan ID, billing cycle, and phone number are required' }, 400);
    }

    // Get user details
    const user = await c.env.DB.prepare(`
      SELECT email, name FROM users WHERE id = ?
    `).bind(payload.userId).first() as any;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get plan details
    const plan = await getSubscriptionPlan(c.env.DB, planId);
    if (!plan) {
      return c.json({ error: 'Invalid plan' }, 400);
    }

    // Get price based on plan and billing cycle
    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    
    // Convert price from cents to ETB (assuming price is in cents)
    const amountInETB = Math.round(price / 100 * 30); // Convert USD to ETB (approximate rate)

    // Initialize Chapa service
    const chapaService = new ChapaService({
      secretKey: c.env.CHAPA_SECRET_KEY,
      publicKey: c.env.CHAPA_PUBLIC_KEY,
      encryptionKey: c.env.CHAPA_ENCRYPTION_KEY,
    });

    // Generate unique transaction reference
    const txRef = chapaService.generateTxRef(`PLAN_${plan.tier.toUpperCase()}`);

    // Create payment
    const payment = await chapaService.createPayment({
      amount: amountInETB,
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || 'User',
      phoneNumber: phoneNumber,
      txRef: txRef,
      callbackUrl: `${c.env.FRONTEND_URL}/api/webhooks/chapa`,
      returnUrl: `${c.env.FRONTEND_URL}/dashboard/subscription?success=true&tx_ref=${txRef}`,
      title: `${plan.name} Plan Subscription`,
      description: `${plan.name} plan subscription for ${billingCycle} billing cycle`,
    });

    if (payment.status === 'success' && payment.data?.checkout_url) {
      // Store payment info in database for verification later
      await c.env.DB.prepare(`
        INSERT INTO payment_transactions (id, user_id, plan_id, tx_ref, amount, currency, billing_cycle, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generateId(),
        payload.userId,
        planId,
        txRef,
        amountInETB,
        'ETB',
        billingCycle,
        'pending',
        new Date().toISOString()
      ).run();

      return c.json({
        txRef: txRef,
        url: payment.data.checkout_url,
        amount: amountInETB,
        currency: 'ETB'
      });
    } else {
      return c.json({ error: 'Failed to initialize payment' }, 500);
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    return c.json({ error: 'Failed to initialize payment' }, 500);
  }
});

app.post('/api/subscription/billing-portal', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    
    // For Chapa, we'll redirect to a billing management page
    // Since Chapa doesn't have a billing portal like Stripe
    return c.json({
      url: `${c.env.FRONTEND_URL}/dashboard/subscription?manage=true`,
    });
  } catch (error) {
    console.error('Billing portal error:', error);
    return c.json({ error: 'Failed to create billing portal session' }, 500);
  }
});

// Webhook endpoint for Chapa
app.post('/api/webhooks/chapa', async (c) => {
  try {
    const body = await c.req.json();
    
    // Initialize Chapa webhook handler
    const webhookHandler = new ChapaWebhookHandler(c.env.DB);

    // Handle different event types
    switch (body.event) {
      case 'payment_success':
        await webhookHandler.handlePaymentSuccess(body);
        break;
      case 'payment_failed':
        await webhookHandler.handlePaymentFailed(body);
        break;
      default:
        console.log(`Unhandled event type: ${body.event}`);
    }
    
    return c.json({ received: true });
  } catch (error) {
    console.error('Chapa webhook error:', error);
    return c.json({ error: 'Webhook error' }, 400);
  }
});

// Transaction verification endpoint
app.get('/api/subscription/verify/:txRef', async (c) => {
  try {
    const txRef = c.req.param('txRef');
    
    // Initialize Chapa service
    const chapaService = new ChapaService({
      secretKey: c.env.CHAPA_SECRET_KEY,
      publicKey: c.env.CHAPA_PUBLIC_KEY,
      encryptionKey: c.env.CHAPA_ENCRYPTION_KEY,
    });

    // Verify transaction with Chapa
    const verification = await chapaService.verifyTransaction(txRef);
    
    if (verification.status === 'success' && verification.data) {
      // Update payment transaction status in database
      await c.env.DB.prepare(`
        UPDATE payment_transactions 
        SET status = ?, updated_at = ?
        WHERE tx_ref = ?
      `).bind(
        verification.data.status,
        new Date().toISOString(),
        txRef
      ).run();

      // If payment is successful, update user subscription
      if (verification.data.status === 'success') {
        // Get payment transaction details
        const transaction = await c.env.DB.prepare(`
          SELECT user_id, plan_id, billing_cycle FROM payment_transactions 
          WHERE tx_ref = ?
        `).bind(txRef).first() as any;

        if (transaction) {
          // Update user subscription
          await c.env.DB.prepare(`
            UPDATE users 
            SET tier = ?, subscription_status = 'active', 
                current_period_start = ?, current_period_end = ?
            WHERE id = ?
          `).bind(
            transaction.plan_id,
            new Date().toISOString(),
            new Date(Date.now() + (transaction.billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            transaction.user_id
          ).run();
        }
      }

      return c.json({
        status: verification.data.status,
        txRef: verification.data.tx_ref,
        amount: verification.data.amount,
        currency: verification.data.currency
      });
    } else {
      return c.json({ error: 'Transaction verification failed' }, 400);
    }
  } catch (error) {
    console.error('Transaction verification error:', error);
    return c.json({ error: 'Failed to verify transaction' }, 500);
  }
});

export default app;  
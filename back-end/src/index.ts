// Backend implementation for Hono with cookie-based authentication
// This should be applied to your existing index.ts file

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt, sign, verify } from 'hono/jwt';
import { setCookie, getCookie } from 'hono/cookie';
import { UAParser } from 'ua-parser-js';
import { adminAuthMiddleware, requirePermission, getAdminByEmail, updateAdminLastLogin, verifyAdminPassword, hashAdminPassword, generateId, logAdminActivity, logUserActivity } from './admin-auth-new';
import { 
  getAllAdminUsers, 
  createAdminUser, 
  updateAdminUser, 
  deleteAdminUser, 
  toggleAdminStatus,
  changeAdminPassword,
  ROLE_PERMISSIONS,
  canManageAdmins,
  canDeleteAdmins
} from './admin-management';
import { 
  checkUsageLimit, 
  incrementUsage, 
  getUserUsageSummary, 
  getSubscriptionPlan,
  getSubscriptionPlanById,
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
  BACKEND_URL?: string;
  FROM_EMAIL: string; // Optional, can be set to a verified domain email
  CHAPA_SECRET_KEY: string;
  CHAPA_PUBLIC_KEY: string;
  CHAPA_ENCRYPTION_KEY: string;
  CHAPA_WEBHOOK_SECRET?: string;
}

// Extend Hono context to include adminUser
declare module 'hono' {
  interface ContextVariableMap {
    adminUser: any;
  }
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

// Updated CORS middleware to allow all origins
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin') || '';
  
  // Allow all origins
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Authorization');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

// Utility functions (keep existing ones)

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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        userId,
        'user_registered',
        'auth',
        userId,
        { email, name, tier: 'free' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        verificationRecord.user_id,
        'email_verified',
        'auth',
        verificationRecord.user_id,
        { email: verificationRecord.email, tier: verificationRecord.tier },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        user.id,
        'user_login',
        'auth',
        user.id,
        { email: user.email, tier: user.tier },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        resetRecord.user_id,
        'password_reset',
        'auth',
        resetRecord.user_id,
        { email: resetRecord.email, action: 'password_reset' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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
  try {
    // Get user from JWT token if available
    const authToken = getCookie(c, 'auth_token');
    if (authToken) {
      try {
        const payload = await verify(authToken, c.env.JWT_SECRET as string);
        if (payload && payload.userId) {
          // Log user activity
          try {
            await logUserActivity(
              c.env.DB,
              payload.userId as string,
              'user_logout',
              'auth',
              payload.userId as string,
              { action: 'logout' },
              c.req.header('CF-Connecting-IP'),
              c.req.header('User-Agent')
            );
          } catch (logError) {
            console.error('Activity logging error:', logError);
          }
        }
      } catch (verifyError) {
        // Token is invalid, continue with logout
        console.error('Token verification error during logout:', verifyError);
      }
    }

    // Clear the auth cookie
    setCookie(c, 'auth_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 0, // Expire immediately
    });

    return c.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear the cookie even if logging fails
    setCookie(c, 'auth_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 0,
    });
    return c.json({ success: true });
  }
});

// ===== Admin Auth Routes =====
app.post('/api/admin/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const admin = await getAdminByEmail(c.env.DB as any, email);
    if (!admin) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const row = await (c.env.DB as any)
      .prepare('SELECT password_hash FROM admin_users WHERE id = ?')
      .bind((admin as any).id)
      .first();
    if (!row) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    
    const passwordCheck = await verifyAdminPassword(password, (row as any).password_hash);
    if (!passwordCheck.valid) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    await updateAdminLastLogin(c.env.DB as any, (admin as any).id);

    const token = await sign(
      { adminId: (admin as any).id, email: (admin as any).email, role: (admin as any).role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 },
      (c.env as any).JWT_SECRET,
    );

    setCookie(c, 'admin_auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    // Log the activity
    try {
      await logAdminActivity(c.env.DB, (admin as any).id, 'admin_login', 'auth', (admin as any).id, { email: (admin as any).email }, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

    const adminResponse = {
      id: (admin as any).id,
      email: (admin as any).email,
      name: (admin as any).name,
      role: (admin as any).role,
      permissions: (admin as any).permissions || {},
      isActive: (admin as any).is_active,
      lastLoginAt: (admin as any).last_login_at || null,
      createdAt: (admin as any).created_at,
    };
    return c.json({ adminUser: adminResponse });
  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/admin/auth/me', adminAuthMiddleware as any, async (c) => {
  const admin = (c as any).get('adminUser');
  const adminResponse = {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    permissions: admin.permissions || {},
    isActive: admin.is_active,
    lastLoginAt: admin.last_login_at || null,
    createdAt: admin.created_at,
  };
  return c.json({ adminUser: adminResponse });
});

app.post('/api/admin/auth/logout', async (c) => {
  setCookie(c, 'admin_auth_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/',
    maxAge: 0,
  });
  return c.json({ success: true });
});

// Admin analytics (basic aggregate derived from existing tables)
app.get('/api/admin/analytics/system', adminAuthMiddleware as any, async (c) => {
  try {
    const days = Math.max(1, Math.min(365, parseInt((c.req.query('days') as string) || '30')));

    // Get basic counts
    const totalUsersRow = await (c.env.DB as any).prepare('SELECT COUNT(*) as cnt FROM users').first();
    const totalLinksRow = await (c.env.DB as any).prepare('SELECT COUNT(*) as cnt FROM links').first();
    const totalClicksRow = await (c.env.DB as any).prepare('SELECT SUM(click_count) as cnt FROM links').first();

    // Users by tier
    const tierRows = await (c.env.DB as any)
      .prepare("SELECT tier, COUNT(*) as cnt FROM users GROUP BY tier")
      .all();
    const usersByTier: Record<string, number> = {};
    for (const r of (tierRows?.results || [])) {
      usersByTier[(r as any).tier || 'unknown'] = Number((r as any).cnt || 0);
    }

    // Top links by clicks
    const topLinkRows = await (c.env.DB as any)
      .prepare('SELECT l.id, l.title, l.original_url, l.short_code, l.click_count, u.name as user_name, u.id as user_id FROM links l LEFT JOIN users u ON l.user_id = u.id ORDER BY l.click_count DESC LIMIT 10')
      .all();
    const topLinks = (topLinkRows?.results || []).map((r: any) => ({
      id: r.id,
      title: r.title || r.original_url,
      short_code: r.short_code,
      click_count: Number(r.click_count || 0),
      user_name: r.user_name || '',
      user_id: r.user_id || '',
    }));

    // Links created per day (for the last N days)
    const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const linkDatesRows = await (c.env.DB as any)
      .prepare('SELECT substr(created_at, 1, 10) as d, COUNT(*) as cnt FROM links WHERE created_at >= ? GROUP BY substr(created_at,1,10) ORDER BY d ASC')
      .bind(sinceIso)
      .all();
    const linksByDate: Record<string, number> = {};
    for (const r of (linkDatesRows?.results || [])) {
      linksByDate[(r as any).d] = Number((r as any).cnt || 0);
    }

    // clicksByDate from click_events
    const clicksRows = await (c.env.DB as any)
      .prepare('SELECT substr(created_at,1,10) as d, COUNT(*) as cnt FROM click_events WHERE created_at >= ? GROUP BY substr(created_at,1,10) ORDER BY d ASC')
      .bind(sinceIso)
      .all();
    const clicksByDate: Record<string, number> = {};
    for (const r of (clicksRows?.results || [])) {
      clicksByDate[(r as any).d] = Number((r as any).cnt || 0);
    }

    // Calculate active users (users with subscription_status = 'active')
    const activeUsersRow = await (c.env.DB as any)
      .prepare("SELECT COUNT(*) as cnt FROM users WHERE subscription_status = 'active'")
      .first();

    // Calculate revenue from payment transactions
    const revenueRows = await (c.env.DB as any)
      .prepare("SELECT SUM(amount) as total FROM payment_transactions WHERE status = 'success'")
      .first();
    
    const monthlyRevenueRows = await (c.env.DB as any)
      .prepare("SELECT SUM(amount) as total FROM payment_transactions WHERE status = 'success' AND created_at >= datetime('now', '-30 days')")
      .first();

    // Calculate pending payments
    const pendingPaymentsRow = await (c.env.DB as any)
      .prepare("SELECT COUNT(*) as cnt FROM payment_transactions WHERE status = 'pending'")
      .first();

    // Get recent user registrations
    const recentUsersRows = await (c.env.DB as any)
      .prepare("SELECT id, name, email, tier, created_at FROM users ORDER BY created_at DESC LIMIT 5")
      .all();

    const recentUsers = (recentUsersRows?.results || []).map((r: any) => ({
      id: r.id,
      name: r.name || 'Unknown',
      email: r.email,
      tier: r.tier,
      created_at: r.created_at
    }));

    // Get recent activity (click events)
    const recentActivityRows = await (c.env.DB as any)
      .prepare(`
        SELECT ce.id, ce.created_at, l.short_code, l.title, u.name as user_name, u.email as user_email
        FROM click_events ce
        LEFT JOIN links l ON ce.link_id = l.id
        LEFT JOIN users u ON ce.user_id = u.id
        ORDER BY ce.created_at DESC LIMIT 10
      `)
      .all();

    const recentActivity = (recentActivityRows?.results || []).map((r: any) => ({
      id: r.id,
      type: 'click',
      description: `Click on ${r.title || r.short_code} by ${r.user_name || r.user_email}`,
      created_at: r.created_at,
      user_name: r.user_name,
      link_title: r.title || r.short_code
    }));

    const overview = {
      totalUsers: Number((totalUsersRow as any)?.cnt || 0),
      totalLinks: Number((totalLinksRow as any)?.cnt || 0),
      totalClicks: Number((totalClicksRow as any)?.cnt || 0),
      activeUsers: Number((activeUsersRow as any)?.cnt || 0),
    };

    const revenue = { 
      total: Number((revenueRows as any)?.total || 0), 
      monthly: Number((monthlyRevenueRows as any)?.total || 0), 
      yearly: 0 
    };

    // Device breakdown
    const deviceRows = await (c.env.DB as any)
      .prepare('SELECT device_type, COUNT(*) as cnt FROM click_events WHERE created_at >= ? GROUP BY device_type')
      .bind(sinceIso)
      .all();
    const deviceStats = (deviceRows?.results || []).map((r: any) => ({ device: r.device_type || 'unknown', count: Number(r.cnt || 0) }));

    // Browser breakdown
    const browserRows = await (c.env.DB as any)
      .prepare('SELECT browser, COUNT(*) as cnt FROM click_events WHERE created_at >= ? GROUP BY browser')
      .bind(sinceIso)
      .all();
    const browserStats = (browserRows?.results || []).map((r: any) => ({ browser: r.browser || 'unknown', count: Number(r.cnt || 0) }));

    // Country breakdown
    const countryRows = await (c.env.DB as any)
      .prepare('SELECT country, COUNT(*) as cnt FROM click_events WHERE created_at >= ? GROUP BY country ORDER BY cnt DESC LIMIT 10')
      .bind(sinceIso)
      .all();
    const countryStats = (countryRows?.results || []).map((r: any) => ({ country: r.country || 'Unknown', count: Number(r.cnt || 0) }));

    return c.json({ 
      overview, 
      usersByTier, 
      linksByDate, 
      clicksByDate, 
      topLinks, 
      recentActivity, 
      recentUsers,
      revenue, 
      deviceStats, 
      browserStats, 
      countryStats,
      pendingPayments: Number((pendingPaymentsRow as any)?.cnt || 0)
    });
  } catch (e) {
    console.error('Admin analytics error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: list regular users
app.get('/api/admin/users/regular', adminAuthMiddleware as any, async (c) => {
  try {
    // Optional: permission check
    // await (requirePermission('users', 'read') as any)(c, async () => {});

    const limit = Math.max(1, Math.min(100, parseInt((c.req.query('limit') as string) || '50')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const search = (c.req.query('search') as string) || '';
    const tier = (c.req.query('tier') as string) || '';

    let baseQuery = 'FROM users WHERE 1=1';
    const params: any[] = [];
    if (search) {
      baseQuery += ' AND (LOWER(name) LIKE ? OR LOWER(email) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
    if (tier) {
      baseQuery += ' AND tier = ?';
      params.push(tier);
    }

    const totalRow = await (c.env.DB as any)
      .prepare(`SELECT COUNT(*) as cnt ${baseQuery}`)
      .bind(...params)
      .first();
    const total = Number((totalRow as any)?.cnt || 0);

    const rows = await (c.env.DB as any)
      .prepare(
        `SELECT id, email, name, tier, subscription_status, email_verified, created_at, updated_at ${baseQuery} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, offset)
      .all();

    const users = (rows?.results || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      tier: u.tier,
      subscription_status: u.subscription_status,
      email_verified: !!u.email_verified,
      created_at: u.created_at,
      updated_at: u.updated_at,
      links_count: undefined,
      last_login: undefined,
    }));

    const pagination = {
      limit,
      offset,
      hasMore: offset + users.length < total,
    };

    return c.json({ users, total, pagination });
  } catch (e) {
    console.error('Admin users list error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});



// Test endpoint to check database connectivity
app.get('/api/admin/test-db', async (c) => {
  try {
    // Check if admin_users table exists
    const tableCheck = await (c.env.DB as any)
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'")
      .first();
    
    if (!tableCheck) {
      return c.json({ 
        error: 'Admin tables not found', 
        message: 'Please run the admin system migration first',
        availableTables: await (c.env.DB as any)
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all()
      }, 404);
    }
    
    // Check table structure
    const tableInfo = await (c.env.DB as any)
      .prepare("PRAGMA table_info(admin_users)")
      .all();
    
    return c.json({ 
      success: true, 
      message: 'Admin tables exist',
      tableStructure: tableInfo?.results || []
    });
  } catch (e) {
    console.error('Database test error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: 'Database connection failed', details: errorMessage }, 500);
  }
});

// Admin: list admin users
app.get('/api/admin/users', adminAuthMiddleware as any, requirePermission('admins', 'read') as any, async (c) => {
  try {
    const adminUsers = await getAllAdminUsers(c.env);
    return c.json({ adminUsers });
  } catch (e) {
    console.error('Admin list error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: create admin user
app.post('/api/admin/users', adminAuthMiddleware as any, requirePermission('admins', 'write') as any, async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password, role, permissions } = body || {};
    
    if (!email || !name || !password || !role) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    const currentAdmin = c.get('adminUser') as any;
    const adminUser = await createAdminUser(c.env, { email, name, password, role, permissions }, currentAdmin.id);
    
    return c.json({ adminUser });
  } catch (e) {
    console.error('Create admin error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: errorMessage }, 400);
  }
});

// Admin: update admin user
app.put('/api/admin/users/:id', adminAuthMiddleware as any, requirePermission('admins', 'write') as any, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, role, permissions, isActive } = body || {};
    
    // Prevent updating own role to avoid permission issues
    const currentAdmin = c.get('adminUser') as any;
    if (id === currentAdmin.id && role && role !== currentAdmin.role) {
      return c.json({ error: 'Cannot change your own role' }, 400);
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (isActive !== undefined) updateData.is_active = isActive;
    
    if (Object.keys(updateData).length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }
    
    const adminUser = await updateAdminUser(c.env, id, updateData, currentAdmin.id);
    
    return c.json({ adminUser });
  } catch (e) {
    console.error('Update admin error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: errorMessage }, 400);
  }
});

// Admin: delete admin user
app.delete('/api/admin/users/:id', adminAuthMiddleware as any, requirePermission('admins', 'delete') as any, async (c) => {
  try {
    const id = c.req.param('id');
    const currentAdmin = c.get('adminUser') as any;
    
    await deleteAdminUser(c.env, id, currentAdmin.id);
    
    return c.json({ success: true });
  } catch (e) {
    console.error('Delete admin error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: errorMessage }, 400);
  }
});

// Admin: toggle admin status
app.patch('/api/admin/users/:id/toggle-status', adminAuthMiddleware as any, requirePermission('admins', 'write') as any, async (c) => {
  try {
    const id = c.req.param('id');
    const currentAdmin = c.get('adminUser') as any;
    
    const result = await toggleAdminStatus(c.env, id, currentAdmin.id);
    
    return c.json({ success: true, isActive: result.is_active });
  } catch (e) {
    console.error('Toggle admin status error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: errorMessage }, 400);
  }
});

// Admin: change admin password
app.patch('/api/admin/users/:id/change-password', adminAuthMiddleware as any, requirePermission('admins', 'write') as any, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { password } = body || {};
    
    if (!password) {
      return c.json({ error: 'Password is required' }, 400);
    }
    
    const currentAdmin = c.get('adminUser') as any;
    await changeAdminPassword(c.env, id, password, currentAdmin.id);
    
    return c.json({ success: true });
  } catch (e) {
    console.error('Change admin password error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return c.json({ error: errorMessage }, 400);
  }
});

// Admin: links list
app.get('/api/admin/links', adminAuthMiddleware as any, async (c) => {
  try {
    const limit = Math.max(1, Math.min(100, parseInt((c.req.query('limit') as string) || '50')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const search = (c.req.query('search') as string) || '';
    const userId = (c.req.query('userId') as string) || '';

    let base = 'FROM links l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
    const params: any[] = [];
    if (search) {
      base += ' AND (LOWER(l.title) LIKE ? OR LOWER(l.original_url) LIKE ? OR LOWER(l.short_code) LIKE ?)';
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }
    if (userId) {
      base += ' AND l.user_id = ?';
      params.push(userId);
    }

    const totalRow = await (c.env.DB as any).prepare(`SELECT COUNT(*) as cnt ${base}`).bind(...params).first();
    const total = Number((totalRow as any)?.cnt || 0);

    const rows = await (c.env.DB as any)
      .prepare(`SELECT l.*, u.name as user_name, u.email as user_email ${base} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all();

    const links = (rows?.results || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name,
      user_email: r.user_email,
      original_url: r.original_url,
      short_code: r.short_code,
      custom_domain: r.custom_domain,
      title: r.title,
      description: r.description,
      is_active: !!r.is_active,
      expires_at: r.expires_at,
      click_count: Number(r.click_count || 0),
      created_at: r.created_at,
      updated_at: r.updated_at,
      last_clicked: null,
    }));

    const pagination = { limit, offset, hasMore: offset + links.length < total };
    return c.json({ links, total, pagination });
  } catch (e) {
    console.error('Admin links list error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: update link
app.put('/api/admin/links/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { title, isActive, expiresAt } = body || {};
    const fields: string[] = [];
    const params: any[] = [];
    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (isActive !== undefined) { fields.push('is_active = ?'); params.push(!!isActive ? 1 : 0); }
    if (expiresAt !== undefined) { fields.push('expires_at = ?'); params.push(expiresAt); }
    fields.push('updated_at = ?'); params.push(new Date().toISOString());
    params.push(id);
    await (c.env.DB as any)
      .prepare(`UPDATE links SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();
    const row = await (c.env.DB as any)
      .prepare('SELECT * FROM links WHERE id = ?')
      .bind(id)
      .first();
    return c.json({ link: row });
  } catch (e) {
    console.error('Admin link update error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: delete link
app.delete('/api/admin/links/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    await (c.env.DB as any).prepare('DELETE FROM links WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e) {
    console.error('Admin link delete error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: subscriptions summary from users table
app.get('/api/admin/subscriptions', adminAuthMiddleware as any, async (c) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt((c.req.query('limit') as string) || '100')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const status = (c.req.query('status') as string) || '';

    let base = 'FROM users WHERE 1=1';
    const params: any[] = [];
    if (status) {
      base += ' AND subscription_status = ?';
      params.push(status);
    }

    const totalRow = await (c.env.DB as any).prepare(`SELECT COUNT(*) as cnt ${base}`).bind(...params).first();
    const total = Number((totalRow as any)?.cnt || 0);

    const rows = await (c.env.DB as any)
      .prepare(
        `SELECT id, name, email, tier, subscription_status, current_period_start, current_period_end, cancel_at_period_end ${base} ORDER BY current_period_end DESC LIMIT ? OFFSET ?`
      )
      .bind(...params, limit, offset)
      .all();

    const subscriptions = (rows?.results || []).map((u: any) => ({
      id: `sub_${u.id}`,
      user_id: u.id,
      user_name: u.name,
      user_email: u.email,
      plan_id: u.tier,
      plan_name: u.tier,
      tier: u.tier,
      status: u.subscription_status,
      billing_cycle: 'monthly',
      amount: 0,
      currency: 'ETB',
      current_period_start: u.current_period_start,
      current_period_end: u.current_period_end,
      cancel_at_period_end: !!u.cancel_at_period_end,
      created_at: u.current_period_start,
      updated_at: u.current_period_end,
    }));

    // Basic revenue aggregates (0 until payment rows are integrated)
    const revenue = { total: 0, monthly: 0, yearly: 0 };
    return c.json({ subscriptions, total, revenue });
  } catch (e) {
    console.error('Admin subscriptions error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: payment transactions list
app.get('/api/admin/transactions', adminAuthMiddleware as any, async (c) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt((c.req.query('limit') as string) || '100')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const status = (c.req.query('status') as string) || '';

    let base = 'FROM payment_transactions t LEFT JOIN users u ON t.user_id = u.id LEFT JOIN subscription_plans p ON t.plan_id = p.id WHERE 1=1';
    const params: any[] = [];
    if (status) {
      base += ' AND t.status = ?';
      params.push(status);
    }

    const totalRow = await (c.env.DB as any).prepare(`SELECT COUNT(*) as cnt ${base}`).bind(...params).first();
    const total = Number((totalRow as any)?.cnt || 0);

    const rows = await (c.env.DB as any)
      .prepare(`SELECT t.*, u.name as user_name, u.email as user_email, COALESCE(p.name, t.plan_id) as plan_name ${base} ORDER BY t.created_at DESC LIMIT ? OFFSET ?`)
      .bind(...params, limit, offset)
      .all();

    const transactions = (rows?.results || []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      user_name: r.user_name || '',
      user_email: r.user_email || '',
      plan_name: r.plan_name || r.plan_id,
      tx_ref: r.tx_ref,
      ref_id: (r as any).ref_id,
      amount: Number(r.amount || 0),
      currency: r.currency || 'ETB',
      billing_cycle: r.billing_cycle,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return c.json({ transactions, total, pagination: { limit, offset, hasMore: offset + transactions.length < total } });
  } catch (e) {
    console.error('Admin transactions error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: refund transaction (logical)
app.post('/api/admin/transactions/:id/refund', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    // For now, mark as 'cancelled' if currently 'success' or 'pending'
    const row = await (c.env.DB as any).prepare('SELECT status FROM payment_transactions WHERE id = ?').bind(id).first();
    if (!row) return c.json({ error: 'Transaction not found' }, 404);
    const current = (row as any).status as string;
    const nextStatus = current === 'success' || current === 'pending' ? 'cancelled' : current;
    const now = new Date().toISOString();
    await (c.env.DB as any)
      .prepare('UPDATE payment_transactions SET status = ?, updated_at = ? WHERE id = ?')
      .bind(nextStatus, now, id)
      .run();
    const updated = await (c.env.DB as any)
      .prepare('SELECT * FROM payment_transactions WHERE id = ?')
      .bind(id)
      .first();
    return c.json({ transaction: updated });
  } catch (e) {
    console.error('Admin refund error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: verify payment with Chapa by tx_ref (our initial transaction reference)
app.post('/api/admin/transactions/:txRef/verify', adminAuthMiddleware as any, async (c) => {
  try {
    const txRef = c.req.param('txRef');
    if (!txRef) return c.json({ error: 'txRef required' }, 400);
    
    console.log('Verifying tx_ref:', txRef);
    
    // First, let's see what tx_refs are available in the database
    const allRefs = await (c.env.DB as any).prepare('SELECT ref_id, tx_ref, status FROM payment_transactions WHERE tx_ref IS NOT NULL LIMIT 10').all();
    console.log('Available tx_refs in database:', allRefs?.results || []);

    const secret = (c.env as any).CHAPA_SECRET_KEY;
    if (!secret) {
      console.error('CHAPA_SECRET_KEY not configured. Available env vars:', Object.keys(c.env));
      return c.json({ error: 'Chapa secret key not configured. Please set CHAPA_SECRET_KEY environment variable.' }, 500);
    }

    // According to Chapa documentation: GET https://api.chapa.co/v1/transaction/verify/<tx_ref>
    const chapaUrl = `https://api.chapa.co/v1/transaction/verify/${txRef}`;
    console.log('Calling Chapa API:', chapaUrl);
    
    const chapaRes = await fetch(chapaUrl, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
    });
    
    console.log('Chapa response status:', chapaRes.status, chapaRes.statusText);
    
    const data: any = await chapaRes.json().catch((e) => {
      console.error('Failed to parse Chapa response:', e);
      return { error: 'Invalid JSON response from Chapa' };
    });
    
    console.log('Chapa response data:', data);
    
    if (!chapaRes.ok) {
      console.error('Chapa API error:', { 
        status: chapaRes.status, 
        statusText: chapaRes.statusText, 
        data,
        url: chapaUrl,
        txRef: txRef,
        secretKeyPrefix: secret.substring(0, 10) + '...'
      });
      
      // Provide more specific error messages based on Chapa's response
      let errorMessage = 'Chapa verify failed';
      if (data?.message) {
        errorMessage = data.message;
      } else if (chapaRes.status === 404) {
        errorMessage = 'Transaction reference not found in Chapa system';
      } else if (chapaRes.status === 401) {
        errorMessage = 'Invalid Chapa API key';
      } else if (chapaRes.status === 403) {
        errorMessage = 'Access denied - check API key permissions';
      }
      
      return c.json({ 
        error: errorMessage, 
        details: data,
        status: chapaRes.status,
        statusText: chapaRes.statusText,
        url: chapaUrl,
        txRef: txRef
      });
    }

    // Expected Chapa response: { status: 'success', data: { ... } }
    const chapaStatus = ((data && (data as any).status) || '').toLowerCase();
    const newStatus = chapaStatus === 'success' ? 'success' : chapaStatus === 'failed' ? 'failed' : chapaStatus === 'cancelled' ? 'cancelled' : undefined;

    console.log('Chapa status:', chapaStatus, 'New status:', newStatus);

    // Load txn by tx_ref (our system's reference)
    const row = await (c.env.DB as any).prepare('SELECT * FROM payment_transactions WHERE tx_ref = ?').bind(txRef).first();
    if (!row) {
      // Check if any transactions exist with tx_ref
      const allRefs = await (c.env.DB as any).prepare('SELECT ref_id, tx_ref FROM payment_transactions WHERE tx_ref IS NOT NULL LIMIT 5').all();
      console.log('Available tx_refs:', allRefs?.results || []);
      return c.json({ error: 'Transaction not found', availableRefs: allRefs?.results || [] }, 404);
    }

    const now = new Date().toISOString();
    if (newStatus) {
      await (c.env.DB as any)
        .prepare('UPDATE payment_transactions SET status = ?, updated_at = ? WHERE tx_ref = ?')
        .bind(newStatus, now, txRef)
        .run();
      console.log('Updated transaction status to:', newStatus);
    }

    const updated = await (c.env.DB as any).prepare('SELECT * FROM payment_transactions WHERE tx_ref = ?').bind(txRef).first();
    return c.json({ transaction: updated, chapa: data });
  } catch (e) {
    console.error('Admin verify error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ============================================================================
// ADMIN SUBSCRIPTION PLANS MANAGEMENT
// ============================================================================

/**
 * Get all subscription plans (admin)
 */
app.get('/api/admin/subscription-plans', adminAuthMiddleware as any, async (c) => {
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
        limits: JSON.parse(plan.limits),
        visitorCap: plan.visitor_cap,
        hasFullAnalytics: plan.has_full_analytics,
        hasAdvancedCharts: plan.has_advanced_charts,
        hasPdfDownload: plan.has_pdf_download,
        createdAt: plan.created_at
      }))
    });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Update subscription plan (admin)
 */
app.put('/api/admin/subscription-plans/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const planId = c.req.param('id');
    const { name, tier, priceMonthly, priceYearly, features, limits, visitorCap, hasFullAnalytics, hasAdvancedCharts, hasPdfDownload } = await c.req.json();

    // Validate required fields
    if (!name || !tier || priceMonthly === undefined || priceYearly === undefined) {
      return c.json({ error: 'Name, tier, priceMonthly, and priceYearly are required' }, 400);
    }

    // Validate tier
    if (!['free', 'pro', 'premium'].includes(tier)) {
      return c.json({ error: 'Invalid tier. Must be free, pro, or premium' }, 400);
    }

    // Update the plan
    await c.env.DB.prepare(`
      UPDATE subscription_plans 
      SET name = ?, tier = ?, price_monthly = ?, price_yearly = ?, 
          features = ?, limits = ?, visitor_cap = ?, has_full_analytics = ?, 
          has_advanced_charts = ?, has_pdf_download = ?
      WHERE id = ?
    `).bind(
      name,
      tier,
      priceMonthly,
      priceYearly,
      JSON.stringify(features),
      JSON.stringify(limits),
      visitorCap || null,
      hasFullAnalytics || false,
      hasAdvancedCharts || false,
      hasPdfDownload || false,
      planId
    ).run();

    // Get updated plan
    const updatedPlan = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ?
    `).bind(planId).first();

    if (!updatedPlan) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    return c.json({
      plan: {
        id: updatedPlan.id,
        name: updatedPlan.name,
        tier: updatedPlan.tier,
        priceMonthly: updatedPlan.price_monthly,
        priceYearly: updatedPlan.price_yearly,
        features: JSON.parse(updatedPlan.features as string),
        limits: JSON.parse(updatedPlan.limits as string),
        visitorCap: updatedPlan.visitor_cap,
        hasFullAnalytics: updatedPlan.has_full_analytics,
        hasAdvancedCharts: updatedPlan.has_advanced_charts,
        hasPdfDownload: updatedPlan.has_pdf_download,
        createdAt: updatedPlan.created_at
      }
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Create new subscription plan (admin)
 */
app.post('/api/admin/subscription-plans', adminAuthMiddleware as any, async (c) => {
  try {
    const { name, tier, priceMonthly, priceYearly, features, limits, visitorCap, hasFullAnalytics, hasAdvancedCharts, hasPdfDownload } = await c.req.json();

    // Validate required fields
    if (!name || !tier || priceMonthly === undefined || priceYearly === undefined) {
      return c.json({ error: 'Name, tier, priceMonthly, and priceYearly are required' }, 400);
    }

    // Validate tier
    if (!['free', 'pro', 'premium'].includes(tier)) {
      return c.json({ error: 'Invalid tier. Must be free, pro, or premium' }, 400);
    }

    // Generate unique ID
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insert new plan
    await c.env.DB.prepare(`
      INSERT INTO subscription_plans (id, name, tier, price_monthly, price_yearly, features, limits, visitor_cap, has_full_analytics, has_advanced_charts, has_pdf_download)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      planId,
      name,
      tier,
      priceMonthly,
      priceYearly,
      JSON.stringify(features),
      JSON.stringify(limits),
      visitorCap || null,
      hasFullAnalytics || false,
      hasAdvancedCharts || false,
      hasPdfDownload || false
    ).run();

    // Get created plan
    const newPlan = await c.env.DB.prepare(`
      SELECT * FROM subscription_plans WHERE id = ?
    `).bind(planId).first() as any;

    if (!newPlan) {
      return c.json({ error: 'Failed to create plan' }, 500);
    }

    return c.json({
      plan: {
        id: newPlan.id,
        name: newPlan.name,
        tier: newPlan.tier,
        priceMonthly: newPlan.price_monthly,
        priceYearly: newPlan.price_yearly,
        features: JSON.parse(newPlan.features as string),
        limits: JSON.parse(newPlan.limits as string),
        visitorCap: newPlan.visitor_cap,
        hasFullAnalytics: newPlan.has_full_analytics,
        hasAdvancedCharts: newPlan.has_advanced_charts,
        hasPdfDownload: newPlan.has_pdf_download,
        createdAt: newPlan.created_at
      }
    });
  } catch (error) {
    console.error('Create subscription plan error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Delete subscription plan (admin) - only if no users are subscribed to it
 */
app.delete('/api/admin/subscription-plans/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const planId = c.req.param('id');

    // Check if any users are subscribed to this plan
    const usersWithPlan = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM users WHERE tier = ?
    `).bind(planId).first() as any;

    if (usersWithPlan && (usersWithPlan.count as number) > 0) {
      return c.json({ 
        error: 'Cannot delete plan. Users are currently subscribed to this plan.',
        userCount: usersWithPlan.count as number
      }, 400);
    }

    // Delete the plan
    const result = await c.env.DB.prepare(`
      DELETE FROM subscription_plans WHERE id = ?
    `).bind(planId).run();

    if ((result as any).changes === 0) {
      return c.json({ error: 'Plan not found' }, 404);
    }

    return c.json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    console.error('Delete subscription plan error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Download transactions as CSV (admin)
 */
app.get('/api/admin/transactions/download', adminAuthMiddleware as any, async (c) => {
  try {
    const { format = 'csv' } = c.req.query() as { format?: string };
    
    // Get all transactions with user and plan details
    const transactions = await c.env.DB.prepare(`
      SELECT 
        t.id,
        t.tx_ref,
        t.amount,
        t.currency,
        t.billing_cycle,
        t.status,
        t.created_at,
        t.updated_at,
        u.name as user_name,
        u.email as user_email,
        p.name as plan_name
      FROM payment_transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN subscription_plans p ON t.plan_id = p.id
      ORDER BY t.created_at DESC
    `).all();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Transaction ID',
        'User Name',
        'User Email',
        'Plan Name',
        'Amount',
        'Currency',
        'Billing Cycle',
        'Status',
        'Created At',
        'Updated At'
      ];

      const csvRows = transactions.results.map((tx: any) => [
        tx.tx_ref,
        tx.user_name || 'N/A',
        tx.user_email || 'N/A',
        tx.plan_name || 'N/A',
        tx.amount,
        tx.currency,
        tx.billing_cycle,
        tx.status,
        tx.created_at,
        tx.updated_at
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else {
      // Return JSON
      return c.json({
        transactions: transactions.results,
        total: transactions.results.length,
        downloadedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Download transactions error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'profile_updated',
        'user',
        payload.userId,
        { name, email, bio },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'password_updated',
        'user',
        payload.userId,
        { action: 'password_changed' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'link_created',
        'link',
        linkId,
        { shortCode, originalUrl, title: pageTitle },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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

    // Log user activity for viewing links
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'links_viewed',
        'link',
        undefined,
        { count: links.results.length, action: 'viewed_links_list' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for viewing links:', logError);
    }

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

    // Log user activity for viewing specific link
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'link_viewed',
        'link',
        linkId,
        { shortCode: link.short_code, title: link.title, action: 'viewed_specific_link' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for viewing link:', logError);
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
    const { title, isActive, expiresAt, shortCode } = await c.req.json();

    // If shortCode is provided, require Premium and ensure uniqueness
    if (typeof shortCode === 'string' && shortCode.trim().length > 0) {
      const user = await c.env.DB.prepare(
        'SELECT tier FROM users WHERE id = ?'
      ).bind(payload.userId).first() as { tier: string } | null;
      if (!user) {
        return c.json({ error: 'User not found' }, 404);
      }
      if (user.tier !== 'premium') {
        return c.json({ error: 'Custom short codes require Premium plan' }, 403);
      }

      // Uniqueness: short code must not exist on any other link
      const existing = await c.env.DB.prepare(
        'SELECT id FROM links WHERE short_code = ? AND id <> ?'
      ).bind(shortCode.trim(), linkId).first();
      if (existing) {
        return c.json({ error: 'Short code already in use' }, 409);
      }
    }

    const result = await c.env.DB.prepare(`
      UPDATE links 
      SET title = ?,
          is_active = ?,
          expires_at = ?,
          short_code = COALESCE(?, short_code),
          updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(
      title,
      isActive,
      expiresAt || null,
      (typeof shortCode === 'string' && shortCode.trim().length > 0) ? shortCode.trim() : null,
      new Date().toISOString(),
      linkId,
      payload.userId
    ).run();

    // D1Result does not have a 'changes' property, so check the number of affected rows via 'success' or 'meta'
    // See: https://developers.cloudflare.com/d1/platform/client-api/#d1result
    if (!result.success || (result.meta && result.meta.changes === 0)) {
      return c.json({ error: 'Link not found' }, 404);
    }

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'link_updated',
        'link',
        linkId,
        { title, isActive, expiresAt, shortCode },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
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

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'link_deleted',
        'link',
        linkId,
        { action: 'deleted' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
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
    const clicksByReferrerPath: { [key: string]: number } = {};

    analytics.results.forEach((row: any) => {
      clicksByDate[row.date] = (clicksByDate[row.date] || 0) + row.clicks;
      if (row.country) clicksByCountry[row.country] = (clicksByCountry[row.country] || 0) + row.clicks;
      if (row.device_type) clicksByDevice[row.device_type] = (clicksByDevice[row.device_type] || 0) + row.clicks;
      if (row.browser) clicksByBrowser[row.browser] = (clicksByBrowser[row.browser] || 0) + row.clicks;
      if (row.referer) clicksByReferrer[row.referer] = (clicksByReferrer[row.referer] || 0) + row.clicks;
      if (row.referer) {
        try {
          const u = new URL(row.referer);
          const path = `${u.hostname}${u.pathname}`;
          clicksByReferrerPath[path] = (clicksByReferrerPath[path] || 0) + row.clicks;
        } catch {
          // ignore invalid URL
        }
      }
    });

    // Hourly breakdown for premium (advanced charts)
    let clicksByHour: { [key: string]: number } = {};
    const canSeeAdvancedHourly = await canSeeAdvancedCharts(c.env.DB, payload.userId);
    if (canSeeAdvancedHourly) {
      const hourly = await c.env.DB.prepare(`
        SELECT strftime('%Y-%m-%d %H:00', timestamp) as hour, COUNT(*) as clicks
        FROM analytics_events
        WHERE link_id = ? AND timestamp >= ?
        AND timestamp >= datetime('now', '-${plan?.limits.analytics_retention_days || 7} days')
        GROUP BY hour
        ORDER BY hour ASC
      `).bind(linkId, startDate.toISOString()).all();
      hourly.results.forEach((row: any) => {
        clicksByHour[row.hour] = row.clicks;
      });
    }

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

      clicksByReferrerPath: canSeeAdvanced ? clicksByReferrerPath : {},
      clicksByHour: canSeeAdvanced ? clicksByHour : {},
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
      return c.redirect('http://localhost:3000/404');
    }

    // Check if link is expired
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return c.redirect('http://localhost:3000/expired');
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

    const { device_type, browser, os } = parseUserAgent(userAgent);

    // Create click event (for admin analytics)
    await c.env.DB.prepare(`
      INSERT INTO click_events (id, link_id, user_id, country, device_type, browser, referrer)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      generateId(),
      link.id,
      link.user_id,
      country || null,
      device_type || null,
      browser || null,
      referer || null
    ).run();

    // Increment click count
    await c.env.DB.prepare(
      'UPDATE links SET click_count = click_count + 1 WHERE id = ?'
    ).bind(link.id).run();

    // Log user activity for link click
    try {
      await logUserActivity(
        c.env.DB,
        link.user_id,
        'link_clicked',
        'link',
        link.id,
        { shortCode: link.short_code, title: link.title, originalUrl: link.original_url },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for link click:', logError);
    }

    // Track new visitor for the link owner
    await trackNewVisitor(c.env.DB, link.user_id);

    // Redirect to original URL
    return c.redirect(link.original_url);

  } catch (error) {
    console.error('Redirect error:', error);
    return c.redirect('http://localhost:3000/error');
  }
});

// Global analytics endpoint
app.get('/api/analytics/global', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const days = parseInt(c.req.query('days') || '30');

    // Update last visit time for user
    await updateLastVisit(c.env.DB, payload.userId);

    // Log user activity
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'analytics_viewed',
        'analytics',
        undefined,
        { days, action: 'viewed_global_analytics' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

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
        link_id,
        referer
      FROM analytics_events 
      WHERE link_id IN (${links.results.map(() => '?').join(',')}) 
      AND timestamp >= ?
      AND timestamp >= datetime('now', '-${plan?.limits.analytics_retention_days || 7} days')
      GROUP BY DATE(timestamp), country, device_type, browser, link_id, referer
      ORDER BY timestamp DESC
    `).bind(...links.results.map((l: any) => l.id), startDate.toISOString()).all();

    // Process analytics data
    const clicksByDate: { [key: string]: number } = {};
    const clicksByCountry: { [key: string]: number } = {};
    const clicksByDevice: { [key: string]: number } = {};
    const clicksByBrowser: { [key: string]: number } = {};
    const clicksByLink: { [key: string]: number } = {};
    const clicksByReferrerPath: { [key: string]: number } = {};

    analytics.results.forEach((row: any) => {
      clicksByDate[row.date] = (clicksByDate[row.date] || 0) + row.clicks;
      if (row.country) clicksByCountry[row.country] = (clicksByCountry[row.country] || 0) + row.clicks;
      if (row.device_type) clicksByDevice[row.device_type] = (clicksByDevice[row.device_type] || 0) + row.clicks;
      if (row.browser) clicksByBrowser[row.browser] = (clicksByBrowser[row.browser] || 0) + row.clicks;
      if (row.link_id) clicksByLink[row.link_id] = (clicksByLink[row.link_id] || 0) + row.clicks;
      if (row.referer) {
        try {
          const u = new URL(row.referer);
          const path = `${u.hostname}${u.pathname}`;
          clicksByReferrerPath[path] = (clicksByReferrerPath[path] || 0) + row.clicks;
        } catch {}
      }
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

    // Hourly breakdown for premium
    let clicksByHour: { [key: string]: number } = {};
    if (canSeeAdvanced) {
      const hourly = await c.env.DB.prepare(`
        SELECT strftime('%Y-%m-%d %H:00', timestamp) as hour, COUNT(*) as clicks
        FROM analytics_events
        WHERE link_id IN (${links.results.map(() => '?').join(',')}) AND timestamp >= ?
        AND timestamp >= datetime('now', '-${plan?.limits.analytics_retention_days || 7} days')
        GROUP BY hour
        ORDER BY hour ASC
      `).bind(...links.results.map((l: any) => l.id), startDate.toISOString()).all();
      hourly.results.forEach((row: any) => { clicksByHour[row.hour] = row.clicks; });
    }

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

      clicksByReferrerPath: canSeeAdvanced ? clicksByReferrerPath : {},
      clicksByHour: canSeeAdvanced ? clicksByHour : {},
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
    
    // Log user activity for viewing usage
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'usage_viewed',
        'subscription',
        undefined,
        { action: 'viewed_usage_summary', plan: usageSummary.plan.tier },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for viewing usage:', logError);
    }
    
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
    
    // Log user activity for viewing subscription
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'subscription_viewed',
        'subscription',
        undefined,
        { tier: user.tier, status: user.subscription_status, action: 'viewed_subscription_info' },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for viewing subscription:', logError);
    }
    
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

// ============================================================================
// CHAPA PAYMENT INTEGRATION ROUTES
// ============================================================================

/**
 * Initialize Chapa payment checkout
 * Creates payment session and returns checkout URL
 */
app.post('/api/subscription/checkout', authMiddleware, async (c) => {
  try {
    console.log('Payment checkout request received');
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

    // Get plan details by ID
    const plan = await getSubscriptionPlanById(c.env.DB, planId);
    if (!plan) {
      return c.json({ error: 'Invalid plan' }, 400);
    }

    // Calculate price based on billing cycle
    const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
    const amountInETB = Math.round(price / 100); // Convert from cents to ETB

    // Initialize Chapa service
    const chapaService = new ChapaService({
      secretKey: c.env.CHAPA_SECRET_KEY,
      publicKey: c.env.CHAPA_PUBLIC_KEY,
      encryptionKey: c.env.CHAPA_ENCRYPTION_KEY,
    });

    // Generate unique transaction reference
    const txRef = chapaService.generateTxRef(`PLAN_${plan.tier.toUpperCase()}`);

    // Create payment with Chapa
    const backendOrigin = c.env.BACKEND_URL || new URL(c.req.url).origin;
    const payment = await chapaService.createPayment({
      amount: amountInETB,
      email: user.email,
      firstName: user.name?.split(' ')[0] || 'User',
      lastName: user.name?.split(' ').slice(1).join(' ') || 'User',
      phoneNumber: phoneNumber,
      txRef: txRef,
      // Ensure callback posts to backend so we can capture ref_id from Chapa
      callbackUrl: `${backendOrigin}/api/payment/callback`,
      returnUrl: `${c.env.FRONTEND_URL}/dashboard/subscription/receipt?tx_ref=${txRef}`,
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

      // Log user activity
      try {
        await logUserActivity(
          c.env.DB,
          payload.userId,
          'subscription_checkout',
          'subscription',
          planId,
          { planId, billingCycle, amount: amountInETB, currency: 'ETB', txRef },
          c.req.header('CF-Connecting-IP'),
          c.req.header('User-Agent')
        );
      } catch (logError) {
        console.error('Activity logging error:', logError);
      }

      return c.json({
        txRef: txRef,
        url: payment.data.checkout_url,
        amount: amountInETB,
        currency: 'ETB'
      });
    } else {
      console.error('Payment failed:', payment);
      return c.json({ 
        error: 'Failed to initialize payment', 
        details: payment.message || 'Unknown error',
        status: payment.status 
      }, 500);
    }
  } catch (error) {
    console.error('Payment initialization error:', error);
    return c.json({ error: 'Failed to initialize payment' }, 500);
  }
});

/**
 * Verify Chapa transaction status
 * Called after payment completion to confirm status
 */
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
        const transaction = await c.env.DB.prepare(`
          SELECT user_id, plan_id, billing_cycle FROM payment_transactions 
          WHERE tx_ref = ?
        `).bind(txRef).first() as any;

        if (transaction) {
          const paidPlan = await getSubscriptionPlanById(c.env.DB, transaction.plan_id);
          const newTier = paidPlan?.tier || 'pro';

          await c.env.DB.prepare(`
            UPDATE users 
            SET tier = ?, subscription_status = 'active', 
                current_period_start = ?, current_period_end = ?
            WHERE id = ?
          `).bind(
            newTier,
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

/**
 * Chapa webhook endpoint (POST)
 * Receives real-time payment notifications from Chapa
 */
app.post('/api/webhooks/chapa', async (c) => {
  try {
    // Read raw body for signature verification
    const rawBody = await c.req.text();
    console.log('Chapa callback raw body (truncated):', rawBody?.slice(0, 800));

    // Verify webhook signature when secret is configured
    const secret = c.env.CHAPA_WEBHOOK_SECRET;
    const signatureHeader = c.req.header('chapa-signature') || c.req.header('x-chapa-signature');
    
    if (secret) {
      if (!signatureHeader) {
        console.error('Missing Chapa signature header');
        return c.json({ error: 'Signature missing' }, 401);
      }

      // Verify HMAC-SHA256 signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      // Check both signature types (body and secret)
      const macBody = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const computedBody = Array.from(new Uint8Array(macBody)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const macSecret = await crypto.subtle.sign('HMAC', key, encoder.encode(secret));
      const computedSecret = Array.from(new Uint8Array(macSecret)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (signatureHeader !== computedBody && signatureHeader !== computedSecret) {
        console.error('Invalid Chapa signature');
        return c.json({ error: 'Invalid signature' }, 401);
      }
    }

    // Parse JSON body
    let body: any = {};
    if (rawBody) {
      try { 
        body = JSON.parse(rawBody); 
      } catch { 
        body = {}; 
      }
    }

    // Normalize common fields
    const event = body.event || body.type || body.event_type || undefined;
    const data = body.data || body || {};
    const statusRaw = data.status || body.status || data.payment_status || '';
    const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : '';

    // Initialize Chapa webhook handler
    const webhookHandler = new ChapaWebhookHandler(c.env.DB);

    // Determine event type and handle accordingly
    const isSuccessEvent = (
      event === 'payment_success' ||
      event === 'charge.success' ||
      event === 'charge.completed' ||
      ['success', 'paid', 'completed'].includes(status)
    );

    const isFailedEvent = (
      event === 'payment_failed' ||
      event === 'charge.failed' ||
      event === 'charge.cancelled' ||
      ['failed', 'cancelled', 'canceled', 'declined'].includes(status)
    );

    if (isSuccessEvent) {
      await webhookHandler.handlePaymentSuccess({ event, data });
    } else if (isFailedEvent) {
      await webhookHandler.handlePaymentFailed({ event, data });
    } else {
      console.log('Chapa webhook received (unclassified):', { event, status, body });
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Chapa webhook error:', error);
    return c.json({ error: 'Webhook error' }, 400);
  }
});

/**
 * Chapa callback_url endpoint (POST)
 * This receives Chapa's POST to callback_url and persists ref_id linked to tx_ref
 */
app.post('/api/payment/callback', async (c) => {
  try {
    const rawBody = await c.req.text();

    // Optional signature verification
    const secret = c.env.CHAPA_WEBHOOK_SECRET;
    const signatureHeader = c.req.header('chapa-signature') || c.req.header('x-chapa-signature');
    let signatureValid = false;
    if (secret) {
      if (!signatureHeader) {
        console.warn('Missing Chapa signature header on callback - proceeding non-strict');
      }
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const macBody = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const computedBody = Array.from(new Uint8Array(macBody)).map(b => b.toString(16).padStart(2, '0')).join('');
      const macSecret = await crypto.subtle.sign('HMAC', key, encoder.encode(secret));
      const computedSecret = Array.from(new Uint8Array(macSecret)).map(b => b.toString(16).padStart(2, '0')).join('');
      signatureValid = signatureHeader === computedBody || signatureHeader === computedSecret;
      if (!signatureValid) {
        console.warn('Invalid Chapa signature on callback - proceeding non-strict');
      }
    }

    let body: any = {};
    const contentType = c.req.header('content-type') || '';
    try {
      if (rawBody && contentType.includes('application/json')) {
        body = JSON.parse(rawBody);
      } else if (rawBody && contentType.includes('application/x-www-form-urlencoded')) {
        const params = new URLSearchParams(rawBody);
        body = Object.fromEntries(params.entries());
      } else {
        body = rawBody ? JSON.parse(rawBody) : {};
      }
    } catch {
      try {
        const params = new URLSearchParams(rawBody || '');
        body = Object.fromEntries(params.entries());
      } catch {
        body = {};
      }
    }

    const data = body.data || body || {};
    // tx_ref (ours) may appear as tx_ref or trx_ref only
    const txRefRaw = data.tx_ref || data.trx_ref || body.tx_ref || body.trx_ref;
    const txRef = typeof txRefRaw === 'string' ? txRefRaw.trim() : txRefRaw;
    // Chapa's receipt/reference id
    const refIdRaw = data.ref_id || data.reference || data.reference_id || data.ref || data.receipt_id || body.ref_id || body.reference || body.reference_id || body.ref || body.receipt_id;
    const refId = typeof refIdRaw === 'string' ? refIdRaw.trim() : refIdRaw;
    console.log('Chapa callback parsed refs:', { txRef, refId, status: data.status || body.status });
    const statusRaw = data.status || body.status || '';
    const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : undefined;

    if (!txRef) {
      console.error('Callback missing tx_ref. Body:', body);
      return c.json({ error: 'Missing tx_ref' }, 400);
    }

    // Persist ref_id if present and update status when provided
    let savedRef = false;
    if (refId) {
      const updateRes = await c.env.DB.prepare(`
        UPDATE payment_transactions
        SET ref_id = ?, updated_at = ?
        WHERE tx_ref = ?
      `).bind(refId, new Date().toISOString(), txRef).run();
      const verify = await c.env.DB.prepare(`
        SELECT ref_id FROM payment_transactions WHERE tx_ref = ?
      `).bind(txRef).first() as any;
      savedRef = !!verify?.ref_id;
      if (!savedRef) {
        console.error('Failed to persist ref_id for tx_ref:', txRef, 'update result:', updateRes);
      }
    }

    if (status) {
      await c.env.DB.prepare(`
        UPDATE payment_transactions
        SET status = ?, updated_at = ?
        WHERE tx_ref = ?
      `).bind(status, new Date().toISOString(), txRef).run();
    }

    return c.json({ received: true, signatureValid, savedRef, txRef, refId, status });
  } catch (error) {
    console.error('Chapa callback_url handler error:', error);
    return c.json({ error: 'Callback processing error' }, 400);
  }
});

/**
 * Query endpoint for polling ref_id by tx_ref
 */
app.get('/api/payment/ref/:txRef', async (c) => {
  try {
    const txRef = c.req.param('txRef');
    const row = await c.env.DB.prepare(`
      SELECT ref_id, status FROM payment_transactions WHERE tx_ref = ?
    `).bind(txRef).first() as any;

    if (!row) {
      return c.json({ error: 'Not found' }, 404);
    }

    return c.json({ refId: row.ref_id || null, status: row.status || null });
  } catch (error) {
    console.error('Fetch ref_id error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Get current user's payment history
 */
app.get('/api/subscription/history', authMiddleware, async (c) => {
  try {
    const payload = c.get('jwtPayload');
    const results = await c.env.DB.prepare(`
      SELECT 
        pt.tx_ref,
        pt.ref_id,
        pt.amount,
        pt.currency,
        pt.billing_cycle,
        pt.status,
        pt.created_at,
        pt.updated_at,
        sp.name AS plan_name,
        sp.tier AS plan_tier
      FROM payment_transactions pt
      LEFT JOIN subscription_plans sp ON sp.id = pt.plan_id
      WHERE pt.user_id = ?
      ORDER BY pt.created_at DESC
    `).bind(payload.userId).all();

    const history = results.results.map((row: any) => ({
      txRef: row.tx_ref,
      refId: row.ref_id,
      amount: row.amount,
      currency: row.currency,
      billingCycle: row.billing_cycle,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      planName: row.plan_name,
      planTier: row.plan_tier,
    }));

    // Log user activity for viewing subscription history
    try {
      await logUserActivity(
        c.env.DB,
        payload.userId,
        'subscription_history_viewed',
        'subscription',
        undefined,
        { action: 'viewed_subscription_history', count: history.length },
        c.req.header('CF-Connecting-IP'),
        c.req.header('User-Agent')
      );
    } catch (logError) {
      console.error('Activity logging error for viewing subscription history:', logError);
    }

    return c.json({ history });
  } catch (error) {
    console.error('Get subscription history error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

/**
 * Chapa callback endpoint (GET)
 * Handles redirects from Chapa checkout with payment status
 */
app.get('/api/webhooks/chapa', async (c) => {
  try {
    const url = new URL(c.req.url);
    const rawBody = '';

    // Optional signature verification for GET callbacks
    const secret = c.env.CHAPA_WEBHOOK_SECRET;
    const signatureHeader = c.req.header('chapa-signature') || c.req.header('x-chapa-signature');
    
    if (secret && signatureHeader) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const macBody = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
      const computedBody = Array.from(new Uint8Array(macBody)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      const macSecret = await crypto.subtle.sign('HMAC', key, encoder.encode(secret));
      const computedSecret = Array.from(new Uint8Array(macSecret)).map(b => b.toString(16).padStart(2, '0')).join('');

      if (signatureHeader !== computedBody && signatureHeader !== computedSecret) {
        console.error('Invalid Chapa signature (GET callback)');
        return c.json({ error: 'Invalid signature' }, 400);
      }
    }

    // Extract payment references from URL parameters
    const txRef = url.searchParams.get('tx_ref') || url.searchParams.get('trx_ref') || url.searchParams.get('txRef') || url.searchParams.get('reference') || '';
    const status = (url.searchParams.get('status') || '').toLowerCase();

    if (!txRef) {
      return c.json({ error: 'Missing tx_ref' }, 400);
    }

    // Verify with Chapa and update database
    const chapaService = new ChapaService({
      secretKey: c.env.CHAPA_SECRET_KEY,
      publicKey: c.env.CHAPA_PUBLIC_KEY,
      encryptionKey: c.env.CHAPA_ENCRYPTION_KEY,
    });

    const verification = await chapaService.verifyTransaction(txRef);

    if (verification.status === 'success' && verification.data) {
      // Update payment transaction status
      await c.env.DB.prepare(`
        UPDATE payment_transactions 
        SET status = ?, updated_at = ?
        WHERE tx_ref = ?
      `).bind(
        verification.data.status,
        new Date().toISOString(),
        txRef
      ).run();

      // If payment successful, update user subscription
      if (verification.data.status === 'success') {
        const transaction = await c.env.DB.prepare(`
          SELECT user_id, plan_id, billing_cycle FROM payment_transactions 
          WHERE tx_ref = ?
        `).bind(txRef).first() as any;

        if (transaction) {
          const paidPlan = await getSubscriptionPlanById(c.env.DB, transaction.plan_id);
          const newTier = paidPlan?.tier || 'pro';
          
          await c.env.DB.prepare(`
            UPDATE users 
            SET tier = ?, subscription_status = 'active', 
                current_period_start = ?, current_period_end = ?
            WHERE id = ?
          `).bind(
            newTier,
            new Date().toISOString(),
            new Date(Date.now() + (transaction.billing_cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
            transaction.user_id
          ).run();
        }
      }

      return c.json({ received: true, status: verification.data.status, txRef });
    } else {
      return c.json({ error: 'Transaction verification failed', status }, 400);
    }
  } catch (error) {
    console.error('Chapa callback handler error:', error);
    return c.json({ error: 'Callback error' }, 400);
  }
});

// Admin: create regular user
app.post('/api/admin/users/regular', adminAuthMiddleware as any, async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, password, tier } = body || {};
    
    if (!email || !name || !password || !tier) {
      return c.json({ error: 'Missing required fields' }, 400);
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
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, tier, subscription_status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)
    `).bind(userId, email, name, passwordHash, tier, now, now).run();

    const newUser = await c.env.DB.prepare(`
      SELECT id, email, name, tier, subscription_status, email_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).bind(userId).first() as any;

    // Log the activity
    const adminUser = c.get('adminUser') as any;
    try {
      await logAdminActivity(c.env.DB, adminUser.id, 'user_created', 'user', userId, { email, name, tier }, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

    return c.json({ 
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        tier: newUser.tier,
        subscription_status: newUser.subscription_status,
        email_verified: !!newUser.email_verified,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at
      }
    });
  } catch (e) {
    console.error('Create user error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: update regular user
app.put('/api/admin/users/regular/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, email, tier, subscriptionStatus } = body || {};
    
    const fields: string[] = [];
    const params: any[] = [];
    
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (tier !== undefined) { fields.push('tier = ?'); params.push(tier); }
    if (subscriptionStatus !== undefined) { fields.push('subscription_status = ?'); params.push(subscriptionStatus); }
    
    fields.push('updated_at = ?'); 
    params.push(new Date().toISOString());
    params.push(id);

    await c.env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).bind(...params).run();

    const updatedUser = await c.env.DB.prepare(`
      SELECT id, email, name, tier, subscription_status, email_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).bind(id).first() as any;

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Log the activity
    const adminUser = c.get('adminUser') as any;
    try {
      await logAdminActivity(c.env.DB, adminUser.id, 'user_updated', 'user', id, { name, email, tier, subscriptionStatus }, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }

    return c.json({ 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        tier: updatedUser.tier,
        subscription_status: updatedUser.subscription_status,
        email_verified: !!updatedUser.email_verified,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at
      }
    });
  } catch (e) {
    console.error('Update user error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: delete regular user
app.delete('/api/admin/users/regular/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    
    // Get user details before deletion for logging
    const userToDelete = await c.env.DB.prepare('SELECT email, name FROM users WHERE id = ?').bind(id).first() as any;
    
    // Delete user's links first
    await c.env.DB.prepare('DELETE FROM links WHERE user_id = ?').bind(id).run();
    
    // Delete user's payment transactions
    await c.env.DB.prepare('DELETE FROM payment_transactions WHERE user_id = ?').bind(id).run();
    
    // Delete user's email verifications
    await c.env.DB.prepare('DELETE FROM email_verifications WHERE user_id = ?').bind(id).run();
    
    // Delete user's password resets
    await c.env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(id).run();
    
    // Delete user's click events
    await c.env.DB.prepare('DELETE FROM click_events WHERE user_id = ?').bind(id).run();
    
    // Finally delete the user
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    
    // Log the activity
    const adminUser = c.get('adminUser') as any;
    try {
      await logAdminActivity(c.env.DB, adminUser.id, 'user_deleted', 'user', id, { email: userToDelete?.email, name: userToDelete?.name }, c.req.header('CF-Connecting-IP'), c.req.header('User-Agent'));
    } catch (logError) {
      console.error('Activity logging error:', logError);
    }
    
    return c.json({ success: true });
  } catch (e) {
    console.error('Delete user error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: get user by ID
app.get('/api/admin/users/regular/:id', adminAuthMiddleware as any, async (c) => {
  try {
    const id = c.req.param('id');
    
    const user = await c.env.DB.prepare(`
      SELECT id, email, name, tier, subscription_status, email_verified, created_at, updated_at
      FROM users WHERE id = ?
    `).bind(id).first() as any;

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Get user's link count
    const linkCount = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM links WHERE user_id = ?
    `).bind(id).first() as any;

    return c.json({ 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
        subscription_status: user.subscription_status,
        email_verified: !!user.email_verified,
        created_at: user.created_at,
        updated_at: user.updated_at,
        links_count: Number(linkCount?.count || 0)
      }
    });
  } catch (e) {
    console.error('Get user error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: get activity logs
app.get('/api/admin/activity-logs', adminAuthMiddleware as any, async (c) => {
  try {
    const limit = Math.max(1, Math.min(200, parseInt((c.req.query('limit') as string) || '50')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const adminUserId = c.req.query('adminUserId') || '';
    const action = c.req.query('action') || '';

    // Build the query with filters
    let whereConditions = [];
    let queryParams = [];

    if (adminUserId) {
      whereConditions.push('a.admin_user_id = ?');
      queryParams.push(adminUserId);
    }

    if (action) {
      whereConditions.push('a.action = ?');
      queryParams.push(action);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_activity_logs a
      ${whereClause}
    `;
    const countResult = await (c.env.DB as any)
      .prepare(countQuery)
      .bind(...queryParams)
      .first() as any;
    const total = Number(countResult?.total || 0);

    // Get activity logs with admin user details
    const logsQuery = `
      SELECT 
        a.id,
        a.admin_user_id,
        au.name as admin_name,
        au.email as admin_email,
        a.action,
        a.resource,
        a.details,
        a.ip_address,
        a.user_agent,
        a.created_at
      FROM admin_activity_logs a
      LEFT JOIN admin_users au ON a.admin_user_id = au.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logsResult = await (c.env.DB as any)
      .prepare(logsQuery)
      .bind(...queryParams, limit, offset)
      .all();

    const logs = (logsResult?.results || []).map((log: any) => ({
      id: log.id,
      admin_user_id: log.admin_user_id,
      admin_name: log.admin_name || 'Unknown Admin',
      admin_email: log.admin_email || 'unknown@example.com',
      action: log.action,
      resource: log.resource,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at
    }));

    return c.json({
      logs,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (e) {
    console.error('Get activity logs error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: get user activity logs
app.get('/api/admin/user-activity-logs', adminAuthMiddleware as any, async (c) => {
  try {
    // Check if user_activity_logs table exists
    const tableCheck = await (c.env.DB as any)
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_activity_logs'")
      .first();

    if (!tableCheck) {
      // Table doesn't exist yet, return empty result
      return c.json({
        logs: [],
        total: 0,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false
        }
      });
    }

    const limit = Math.max(1, Math.min(200, parseInt((c.req.query('limit') as string) || '50')));
    const offset = Math.max(0, parseInt((c.req.query('offset') as string) || '0'));
    const userId = c.req.query('userId') || '';
    const action = c.req.query('action') || '';
    const resourceType = c.req.query('resourceType') || '';

    // Build the query with filters
    let whereConditions = [];
    let queryParams = [];

    if (userId) {
      whereConditions.push('u.user_id = ?');
      queryParams.push(userId);
    }

    if (action) {
      whereConditions.push('u.action = ?');
      queryParams.push(action);
    }

    if (resourceType) {
      whereConditions.push('u.resource_type = ?');
      queryParams.push(resourceType);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_activity_logs u
      ${whereClause}
    `;
    const countResult = await (c.env.DB as any)
      .prepare(countQuery)
      .bind(...queryParams)
      .first() as any;
    const total = Number(countResult?.total || 0);

    // Get user activity logs with user details
    const logsQuery = `
      SELECT 
        u.id,
        u.user_id,
        usr.name as user_name,
        usr.email as user_email,
        u.action,
        u.resource_type,
        u.resource_id,
        u.details,
        u.ip_address,
        u.user_agent,
        u.created_at
      FROM user_activity_logs u
      LEFT JOIN users usr ON u.user_id = usr.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const logsResult = await (c.env.DB as any)
      .prepare(logsQuery)
      .bind(...queryParams, limit, offset)
      .all();

    const logs = (logsResult?.results || []).map((log: any) => ({
      id: log.id,
      user_id: log.user_id,
      user_name: log.user_name,
      user_email: log.user_email,
      action: log.action,
      resource_type: log.resource_type,
      resource_id: log.resource_id,
      details: log.details,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      created_at: log.created_at
    }));

    return c.json({
      logs,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });
  } catch (e) {
    console.error('Get user activity logs error:', e);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Admin: Get system settings
app.get('/api/admin/settings/system', adminAuthMiddleware as any, requirePermission('system', 'read') as any, async (c) => {
  try {
    const result = await (c.env.DB as any)
      .prepare(`
        SELECT setting_key, setting_value, setting_type, description
        FROM system_settings
        ORDER BY setting_key
      `)
      .all();

    const settings: Record<string, any> = {};
    
    (result?.results || []).forEach((row: any) => {
      let value: any = row.setting_value;
      
      // Convert value based on type
      switch (row.setting_type) {
        case 'number':
          value = Number(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        default:
          // string type - keep as is
          break;
      }
      
      settings[row.setting_key] = value;
    });

    return c.json({ settings });
  } catch (e) {
    console.error('Get system settings error:', e);
    return c.json({ error: 'Failed to load system settings' }, 500);
  }
});

// Admin: Update system settings
app.put('/api/admin/settings/system', adminAuthMiddleware as any, requirePermission('system', 'write') as any, async (c) => {
  try {
    const body = await c.req.json();
    const { settings } = body || {};
    
    if (!settings || typeof settings !== 'object') {
      return c.json({ error: 'Invalid settings data' }, 400);
    }

    const currentAdmin = c.get('adminUser') as any;
    const now = new Date().toISOString();

    // Update each setting
    for (const [key, value] of Object.entries(settings)) {
      const settingType = typeof value === 'boolean' ? 'boolean' : 
                         typeof value === 'number' ? 'number' : 'string';
      
      await (c.env.DB as any)
        .prepare(`
          UPDATE system_settings 
          SET setting_value = ?, setting_type = ?, updated_at = ?
          WHERE setting_key = ?
        `)
        .bind(String(value), settingType, now, key)
        .run();
    }

    // Log the activity
    await logAdminActivity(
      c.env.DB,
      currentAdmin.id,
      'settings_updated',
      'system',
      undefined,
      { updated_keys: Object.keys(settings) },
      c.req.header('CF-Connecting-IP'),
      c.req.header('User-Agent')
    );

    return c.json({ success: true });
  } catch (e) {
    console.error('Update system settings error:', e);
    return c.json({ error: 'Failed to update system settings' }, 500);
  }
});

// Admin: Get individual setting
app.get('/api/admin/settings/:key', adminAuthMiddleware as any, requirePermission('system', 'read') as any, async (c) => {
  try {
    const key = c.req.param('key');
    
    const result = await (c.env.DB as any)
      .prepare(`
        SELECT setting_key, setting_value, setting_type, description
        FROM system_settings
        WHERE setting_key = ?
      `)
      .bind(key)
      .first();

    if (!result) {
      return c.json({ error: 'Setting not found' }, 404);
    }

    let value: any = result.setting_value;
    
    // Convert value based on type
    switch (result.setting_type) {
      case 'number':
        value = Number(value);
        break;
      case 'boolean':
        value = value === 'true';
        break;
      default:
        // string type - keep as is
        break;
    }

    return c.json({ 
      setting: {
        key: result.setting_key,
        value,
        type: result.setting_type,
        description: result.description
      }
    });
  } catch (e) {
    console.error('Get setting error:', e);
    return c.json({ error: 'Failed to load setting' }, 500);
  }
});

// Admin: Update individual setting
app.put('/api/admin/settings/:key', adminAuthMiddleware as any, requirePermission('system', 'write') as any, async (c) => {
  try {
    const key = c.req.param('key');
    const body = await c.req.json();
    const { value } = body || {};
    
    if (value === undefined) {
      return c.json({ error: 'Value is required' }, 400);
    }

    const currentAdmin = c.get('adminUser') as any;
    const settingType = typeof value === 'boolean' ? 'boolean' : 
                       typeof value === 'number' ? 'number' : 'string';
    const now = new Date().toISOString();

    await (c.env.DB as any)
      .prepare(`
        UPDATE system_settings 
        SET setting_value = ?, setting_type = ?, updated_at = ?
        WHERE setting_key = ?
      `)
      .bind(String(value), settingType, now, key)
      .run();

    // Log the activity
    await logAdminActivity(
      c.env.DB,
      currentAdmin.id,
      'setting_updated',
      'system',
      undefined,
      { key, value },
      c.req.header('CF-Connecting-IP'),
      c.req.header('User-Agent')
    );

    return c.json({ 
      setting: {
        key,
        value,
        type: settingType
      }
    });
  } catch (e) {
    console.error('Update setting error:', e);
    return c.json({ error: 'Failed to update setting' }, 500);
  }
});

// Admin: Get all settings (for settings list)
app.get('/api/admin/settings', adminAuthMiddleware as any, requirePermission('system', 'read') as any, async (c) => {
  try {
    const result = await (c.env.DB as any)
      .prepare(`
        SELECT setting_key, setting_value, setting_type, description, updated_at
        FROM system_settings
        ORDER BY setting_key
      `)
      .all();

    const settings = (result?.results || []).map((row: any) => {
      let value: any = row.setting_value;
      
      // Convert value based on type
      switch (row.setting_type) {
        case 'number':
          value = Number(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        default:
          // string type - keep as is
          break;
      }
      
      return {
        key: row.setting_key,
        value,
        type: row.setting_type,
        description: row.description,
        updated_at: row.updated_at
      };
    });

    return c.json({ settings });
  } catch (e) {
    console.error('Get settings error:', e);
    return c.json({ error: 'Failed to load settings' }, 500);
  }
});

export default app;  
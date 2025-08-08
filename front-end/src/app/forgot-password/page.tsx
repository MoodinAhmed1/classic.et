'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, Loader2, Zap, CheckCircle, AlertCircle, Shield, Clock } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.forgotPassword({ email });
      setSuccess(true);
      setMessage(response.message);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg">
                  <Mail className="h-4 w-4 text-green-600" />
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Check Your Email
            </CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              We've sent password reset instructions to your email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
              <Mail className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200 font-medium">
                {message}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 p-5 rounded-xl border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  What happens next?
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Check your email inbox (and spam folder) for our message
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Click the secure reset link in the email
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Create your new password on the secure page
                  </li>
                  <li className="flex items-start">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Sign in with your new password
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950 p-5 rounded-xl border border-amber-200 dark:border-amber-800">
                <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Important Security Information
                </h3>
                <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                  <li>• The reset link expires in <strong>1 hour</strong> for your security</li>
                  <li>• The link can only be used once</li>
                  <li>• If you didn't request this, you can safely ignore the email</li>
                  <li>• Never share the reset link with anyone</li>
                </ul>
              </div>
              
              <div className="flex flex-col space-y-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setMessage('');
                  }}
                  className="w-full h-12 text-base"
                >
                  <Mail className="mr-2 h-5 w-5" />
                  Send Another Email
                </Button>
                
                <Link href="/login" className="w-full">
                  <Button variant="ghost" className="w-full h-12 text-base">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center pb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <Zap className="h-12 w-12 text-blue-600" />
              <span className="ml-3 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                LinkShort
              </span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Forgot Password?</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Enter your email address and we'll send you a secure link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 text-base"
              />
              <p className="text-sm text-muted-foreground">
                We'll send reset instructions to this email address
              </p>
            </div>
            
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              <Mail className="mr-2 h-5 w-5" />
              Send Reset Link
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <Link 
              href="/login" 
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center transition-colors group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Back to Login
            </Link>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Having trouble? Contact our support team for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, Zap, AlertCircle, CheckCircle, Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/api';
import { set } from 'date-fns';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkAuth } = useAuth();    

  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailFromParams = searchParams.get('email');
    const codeFromParams = searchParams.get('code');
    const emailFromStorage = localStorage.getItem('pendingVerificationEmail');
    
    const targetEmail = emailFromParams || emailFromStorage || '';
    setEmail(targetEmail);
    
    // If code is provided in URL, auto-fill it
    if (codeFromParams && codeFromParams.length === 6) {
      setCode(codeFromParams);
      // Auto-verify if we have both email and code
      if (targetEmail) {
        handleVerification(targetEmail, codeFromParams);
      }
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [searchParams]);

  // Auto-verify when code reaches 6 digits
  useEffect(() => {
    if (code.length === 6 && email && !isVerifying) {
      handleVerification(email, code);
    }
  }, [code, email, isVerifying]);

  const handleVerification = async (emailAddress: string, verificationCode: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await authApi.verifyEmail({
        email: emailAddress,
        code: verificationCode
      });

      if (response.success && response.user) {
        setSuccess(response.message || 'Email verified successfully!');
        
        // Clear pending verification email from storage
        localStorage.removeItem('pendingVerificationEmail');
        
        // Log the user in
        await checkAuth();

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
      setCode(''); // Clear the code on error
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || isResending || resendCooldown > 0) return;

    setIsResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await authApi.resendVerification({ email });
      
      if (response.success) {
        setSuccess('Verification code sent! Please check your email.');
        
        // Start cooldown timer
        setResendCooldown(60);
        intervalRef.current = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    setError(''); // Clear error when user starts typing
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-6 sm:pb-8">
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="relative flex items-center">
                <Zap className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
                <span className="ml-2 sm:ml-3 text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  LinkShort
                </span>
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">Email Required</CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              Please provide your email address to verify
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="text-center space-y-3 sm:space-y-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                We need your email address to send you a verification code.
              </p>
              <Link href="/register">
                <Button className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  Go to Registration
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4 sm:p-6">
      <Card className="w-full max-w-sm sm:max-w-md shadow-2xl border-0">
        <CardHeader className="space-y-1 text-center pb-6 sm:pb-8">
          <div className="flex items-center justify-center mb-4 sm:mb-6">
            <div className="relative flex items-center">
              <Zap className="h-8 w-8 sm:h-12 sm:w-12 text-blue-600" />
              <span className="ml-2 sm:ml-3 text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                LinkShort
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold">Verify Your Email</CardTitle>
          <CardDescription className="text-base sm:text-lg text-muted-foreground">
            Enter the 6-digit code sent to your email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
            </Alert>
          )}
          
          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
                <Mail className="h-4 w-4" />
                <span>Code sent to: <strong>{email}</strong></span>
              </div>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={handleCodeChange}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying your email...</span>
              </div>
            )}

            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                The verification code will automatically verify when you enter all 6 digits.
              </p>

              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Didn't receive the code?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isResending || resendCooldown > 0}
                  className="text-sm"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend in {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend Code
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Need to use a different email?{' '}
                <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                  Register again
                </Link>
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Check your email
                </p>
                <p className="text-blue-700 dark:text-blue-200 leading-relaxed">
                  We've sent a 6-digit verification code to your email address. 
                  The code expires in 15 minutes for security.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

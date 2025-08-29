// 'use client';

// import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Alert, AlertDescription } from '@/components/ui/alert';
// import { Loader2, Zap, Eye, EyeOff, AlertCircle, UserPlus } from 'lucide-react';
// import { useAuth } from '@/contexts/auth-context';

// export default function RegisterPage() {
//   const [name, setName] = useState('');
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [passwordStrength, setPasswordStrength] = useState(0);
//   const { register, user, loading } = useAuth();
//   const router = useRouter();

//   // Redirect if already authenticated
//   useEffect(() => {
//     if (!loading && user) {
//       router.replace('/dashboard');
//     }
//   }, [user, loading, router]);

//   // Calculate password strength
//   useEffect(() => {
//     let strength = 0;
//     if (password.length >= 6) strength += 1;
//     if (password.length >= 8) strength += 1;
//     if (/[A-Z]/.test(password)) strength += 1;
//     if (/[a-z]/.test(password)) strength += 1;
//     if (/[0-9]/.test(password)) strength += 1;
//     if (/[^A-Za-z0-9]/.test(password)) strength += 1;
//     setPasswordStrength(strength);
//   }, [password]);

//   const getPasswordStrengthColor = () => {
//     if (passwordStrength <= 2) return 'bg-red-500';
//     if (passwordStrength <= 4) return 'bg-yellow-500';
//     return 'bg-green-500';
//   };

//   const getPasswordStrengthText = () => {
//     if (passwordStrength <= 2) return { text: 'Weak', color: 'text-red-600' };
//     if (passwordStrength <= 4) return { text: 'Medium', color: 'text-yellow-600' };
//     return { text: 'Strong', color: 'text-green-600' };
//   };

//   // Show loading while checking auth
//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen">
//         <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   // Don't render if user is authenticated (will redirect)
//   if (user) {
//     return null;
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setIsLoading(true);
//     setError('');

//     if (password.length < 6) {
//       setError('Password must be at least 6 characters long');
//       setIsLoading(false);
//       return;
//     }

//     try {
//       await register(email, password, name);
//       router.push('/dashboard');
//     } catch (err: any) {
//       setError(err.message || 'Registration failed. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 p-4">
//       <Card className="w-full max-w-md shadow-2xl border-0">
//         <CardHeader className="space-y-1 text-center pb-8">
//           <div className="flex items-center justify-center mb-6">
//             <div className="relative">
//               <Zap className="h-12 w-12 text-blue-600" />
//               <span className="ml-3 text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
//                 LinkShort
//               </span>
//             </div>
//           </div>
//           <CardTitle className="text-3xl font-bold">Create Account</CardTitle>
//           <CardDescription className="text-lg text-muted-foreground">
//             Join LinkShort to start shortening your URLs
//           </CardDescription>
//         </CardHeader>
//         <CardContent>
//           <form onSubmit={handleSubmit} className="space-y-6">
//             {error && (
//               <Alert variant="destructive">
//                 <AlertCircle className="h-4 w-4" />
//                 <AlertDescription>{error}</AlertDescription>
//               </Alert>
//             )}
            
//             <div className="space-y-3">
//               <Label htmlFor="name" className="text-base font-medium">
//                 Full Name
//               </Label>
//               <Input
//                 id="name"
//                 type="text"
//                 placeholder="Enter your full name"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 disabled={isLoading}
//                 className="h-12 text-base"
//               />
//             </div>
            
//             <div className="space-y-3">
//               <Label htmlFor="email" className="text-base font-medium">
//                 Email
//               </Label>
//               <Input
//                 id="email"
//                 type="email"
//                 placeholder="Enter your email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 required
//                 disabled={isLoading}
//                 className="h-12 text-base"
//               />
//             </div>
            
//             <div className="space-y-3">
//               <Label htmlFor="password" className="text-base font-medium">
//                 Password
//               </Label>
//               <div className="relative">
//                 <Input
//                   id="password"
//                   type={showPassword ? 'text' : 'password'}
//                   placeholder="Create a password"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   disabled={isLoading}
//                   className="pr-10 h-12 text-base"
//                 />
//                 <Button
//                   type="button"
//                   variant="ghost"
//                   size="sm"
//                   className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
//                   onClick={() => setShowPassword(!showPassword)}
//                   disabled={isLoading}
//                 >
//                   {showPassword ? (
//                     <EyeOff className="h-4 w-4" />
//                   ) : (
//                     <Eye className="h-4 w-4" />
//                   )}
//                 </Button>
//               </div>
              
//               {password && (
//                 <div className="space-y-2">
//                   <div className="flex items-center justify-between text-sm">
//                     <span className="text-muted-foreground">Password strength:</span>
//                     <span className={`font-medium ${getPasswordStrengthText().color}`}>
//                       {getPasswordStrengthText().text}
//                     </span>
//                   </div>
//                   <div className="w-full bg-gray-200 rounded-full h-2">
//                     <div 
//                       className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
//                       style={{ width: `${(passwordStrength / 6) * 100}%` }}
//                     />
//                   </div>
//                 </div>
//               )}
              
//               <p className="text-sm text-muted-foreground">
//                 Password must be at least 6 characters long
//               </p>
//             </div>
            
//             <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
//               {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
//               <UserPlus className="mr-2 h-5 w-5" />
//               Create Account
//             </Button>
//           </form>
          
//           <div className="mt-8 text-center text-base">
//             <span className="text-muted-foreground">Already have an account? </span>
//             <Link href="/login" className="text-blue-600 hover:underline transition-colors font-medium">
//               Sign in
//             </Link>
//           </div>
          
//           <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
//             <p className="text-xs text-muted-foreground text-center leading-relaxed">
//               By creating an account, you agree to our Terms of Service and Privacy Policy
//             </p>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }


'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Loader2, Zap, AlertCircle, Mail, Lock, User, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';


export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
  const { checkAuth } = useAuth();

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    const feedback: string[] = [];

    if (pwd.length >= 8) {
      strength += 20;
    } else {
      feedback.push('Use at least 8 characters');
    }

    if (/[a-z]/.test(pwd)) {
      strength += 20;
    } else {
      feedback.push('Include lowercase letters');
    }

    if (/[A-Z]/.test(pwd)) {
      strength += 20;
    } else {
      feedback.push('Include uppercase letters');
    }

    if (/[0-9]/.test(pwd)) {
      strength += 20;
    } else {
      feedback.push('Include numbers');
    }

    if (/[^A-Za-z0-9]/.test(pwd)) {
      strength += 20;
    } else {
      feedback.push('Include special characters');
    }

    return { strength, feedback };
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    if (pwd) {
      const { strength, feedback } = calculatePasswordStrength(pwd);
      setPasswordStrength(strength);
      setPasswordFeedback(feedback);
    } else {
      setPasswordStrength(0);
      setPasswordFeedback([]);
    }
  };

  const getStrengthText = (strength: number) => {
    if (strength < 40) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 40) return 'text-red-600';
    if (strength < 60) return 'text-orange-600';
    if (strength < 80) return 'text-yellow-600';
    return 'text-green-600';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.register({ email, password, name  });
      
      if (response.success && response.requiresVerification) {
        setSuccess(response.message || 'Registration successful! Please check your email for a verification code.');
        
        // Store email for verification page
        localStorage.setItem('pendingVerificationEmail', email);
        
        //authenticate
        await checkAuth();

        // Redirect to verification page after a short delay
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show success state
  if (success) {
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
            <div className="flex items-center justify-center mb-3 sm:mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900 p-2 sm:p-3">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold">Check Your Email!</CardTitle>
            <CardDescription className="text-base sm:text-lg text-muted-foreground">
              We've sent a verification code to your email
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
              <Mail className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">{success}</AlertDescription>
            </Alert>
            
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                    Verification email sent to:
                  </p>
                  <p className="text-blue-700 dark:text-blue-200 font-mono text-xs sm:text-sm break-all">
                    {email}
                  </p>
                  <p className="text-blue-600 dark:text-blue-300 mt-2 text-xs">
                    Redirecting to verification page...
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 sm:mt-6 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">
                Didn't receive the email?{' '}
                <Link 
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="text-blue-600 hover:text-blue-500 font-medium transition-colors"
                >
                  Go to verification page
                </Link>
              </p>
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
          <CardTitle className="text-2xl sm:text-3xl font-bold">Create Account</CardTitle>
          <CardDescription className="text-base sm:text-lg text-muted-foreground">
            Join LinkShort to start shortening your URLs
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm sm:text-base">{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="name" className="text-sm sm:text-base font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base pl-10 sm:pl-12"
                />
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="email" className="text-sm sm:text-base font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base pl-10 sm:pl-12"
                />
              </div>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="password" className="text-sm sm:text-base font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base pl-10 sm:pl-12 pr-10 sm:pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 sm:h-12 px-2 sm:px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>
              
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={`font-medium ${getStrengthColor(passwordStrength)}`}>
                      {getStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <Progress 
                    value={passwordStrength} 
                    className="h-2"
                  />
                  {passwordFeedback.length > 0 && (
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {passwordFeedback.map((feedback, index) => (
                        <li key={index}>• {feedback}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 sm:h-12 text-sm sm:text-base pl-10 sm:pl-12 pr-10 sm:pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 sm:h-12 px-2 sm:px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs sm:text-sm text-red-600">Passwords do not match</p>
              )}
            </div>
            
            <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />}
              Create Account
            </Button>
          </form>
          
          <div className="mt-6 sm:mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Already have an account?
                </span>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-6">
              <Link href="/login" className="w-full">
                <Button variant="outline" className="w-full h-11 sm:h-12 text-sm sm:text-base">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
              You'll receive a verification email to confirm your account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

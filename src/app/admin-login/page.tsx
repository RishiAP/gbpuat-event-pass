// pages/page.tsx
"use client";
import axios from 'axios';
import { Card, Label, TextInput, Button, Checkbox } from 'flowbite-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading } from 'react-icons/ai';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/ReactToastify.min.css';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,setLoading]=useState(false);
  const router=useRouter();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Handle the sign-in logic here
    axios.post('/api/login', { email, password,type: 'admin' })
      .then((response) => {
        console.log(response.data);
        toast.success(<p><strong>{response.data.message}.</strong> Redirecting to dashboard.</p>,{theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light"});
        setTimeout(() => {
          router.push('/admin');
        }, 3000);
      })
      .catch((error) => {
        console.error(error);
        toast.error(error.response.data.error,{theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light"});
      }).finally(()=>{
        setLoading(false);
      });
  };

  const handleResetPassword = () => {
    // Handle password reset logic here
    alert('Redirecting to password reset page...');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <Card className="w-full max-w-md shadow-lg">
        <h2 className="text-2xl font-semibold text-center mb-4">Admin Sign In</h2>
        
        <form onSubmit={handleSignIn}>
          {/* Email Input */}
          <div className="mb-4">
            <Label htmlFor="email" value="Email" />
            <TextInput
              id="email"
              type="email"
              placeholder="user@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input with Show Password Feature */}
          <div className="mb-4 relative">
            <Label htmlFor="password" value="Password" />
            <div className="relative">
              <TextInput
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-gray-600"
                onClick={togglePasswordVisibility}
              >
                {showPassword ? <AiOutlineEyeInvisible size={24} /> : <AiOutlineEye size={24} />}
              </button>
            </div>
          </div>

          {/* Remember Me and Reset Password */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="ml-2">Remember me</Label>
            </div>

            <button
              type="button"
              className="text-sm text-blue-600 hover:underline"
              onClick={handleResetPassword}
            >
              Reset Password
            </button>
          </div>

          {/* Sign-in Button */}
          <Button type="submit" fullSized isProcessing={loading} processingSpinner={<AiOutlineLoading className="h-6 w-6 animate-spin"/>} >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Card>
      <ToastContainer draggable draggablePercent={60} position='top-center' />
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import axios, { AxiosError } from "axios";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
type UserRole = "admin" | "verifier";

interface SignInPageProps {
  type: UserRole;
}

/** Sent to the backend – ONE field name */
interface LoginPayload {
  identifier: string;
  password: string;
  type: UserRole;
}

interface LoginResponse {
  message: string;
}
interface ErrorResponse {
  error: string;
}

// ──────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────
const createSignInSchema = (type: UserRole) =>
  z.object({
    identifier:
      type === "admin"
        ? z.email("Invalid email address")
        : z.string().min(3, "Username too short"),
    password: z.string().min(6, "Password too short"),
    rememberMe: z.boolean(),
  });

type SignInFormData = z.infer<ReturnType<typeof createSignInSchema>>;

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────
export default function SignInPage({ type }: SignInPageProps) {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const isAdmin = type === "admin";
  const schema = createSignInSchema(type);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      identifier: "",
      password: "",
      rememberMe: false,
    },
  });

  // ────── Submit ──────
  const onSubmit = async (data: SignInFormData): Promise<void> => {
    const toastId = toast.loading("Signing in...");

    try {
      const payload: LoginPayload = {
        identifier: data.identifier,   // ← SAME KEY for both roles
        password: data.password,
        type,
      };

      const res = await axios.post<LoginResponse>("/api/login", payload);

      toast.dismiss(toastId);
      toast.success(res.data.message, { description: "Redirecting..." });

      setTimeout(() => {
        window.location.pathname = `/${type}`;
      }, 1500);
    } catch (error) {
      toast.dismiss(toastId);
      const msg =
        axios.isAxiosError(error) && error.response?.data?.error
          ? error.response.data.error
          : "Login failed";
      toast.error(msg);
    }
  };

  // ────── Helpers ──────
  const togglePasswordVisibility = () => setShowPassword((p) => !p);
  const handleForgotPassword = () => toast.info("Password reset coming soon!");

  const title = `${type.charAt(0).toUpperCase() + type.slice(1)} Sign In`;
  const inputLabel = isAdmin ? "Email" : "Username";
  const inputType = isAdmin ? "email" : "text";
  const placeholder = isAdmin ? "user@example.com" : "your_username";

  // ────── Render ──────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Identifier */}
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{inputLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type={inputType}
                        placeholder={placeholder}
                        disabled={form.formState.isSubmitting}
                        {...field}
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={form.formState.isSubmitting}
                          {...field}
                          className="h-11 pr-10"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me */}
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={form.formState.isSubmitting}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">Remember me</FormLabel>
                    </div>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </FormItem>
                )}
              />

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
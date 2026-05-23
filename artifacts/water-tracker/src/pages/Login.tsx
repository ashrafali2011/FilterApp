import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLogin, useRegister } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Droplets, LogIn, UserPlus, Users } from "lucide-react";
import { motion } from "framer-motion";

const authSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(6, "At least 6 characters"),
});

type AuthForm = z.infer<typeof authSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, setAsGuest } = useAuth();
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const loginForm = useForm<AuthForm>({ resolver: zodResolver(authSchema), defaultValues: { username: "", password: "" } });
  const registerForm = useForm<AuthForm>({ resolver: zodResolver(authSchema), defaultValues: { username: "", password: "" } });

  const handleLogin = async (data: AuthForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: t("Welcome back!", "مرحباً بعودتك!") });
        setLocation("/");
      },
      onError: () => {
        toast({ title: t("Invalid credentials", "بيانات غير صحيحة"), variant: "destructive" });
      },
    });
  };

  const handleRegister = async (data: AuthForm) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: t("Account created!", "تم إنشاء الحساب!") });
        setLocation("/");
      },
      onError: () => {
        toast({ title: t("Username already taken", "اسم المستخدم مأخوذ"), variant: "destructive" });
      },
    });
  };

  const handleGuest = () => {
    setAsGuest();
    setLocation("/");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <Droplets className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AquaTrack</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t("Water filter maintenance tracker", "متتبع صيانة فلاتر المياه")}
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="w-full mb-6">
              <TabsTrigger value="login" className="flex-1 gap-2">
                <LogIn className="w-4 h-4" />
                {t("Log In", "تسجيل الدخول")}
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1 gap-2">
                <UserPlus className="w-4 h-4" />
                {t("Register", "إنشاء حساب")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Username", "اسم المستخدم")}</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="username" data-testid="input-login-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Password", "كلمة المرور")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="current-password" data-testid="input-login-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login-submit">
                    {loginMutation.isPending ? t("Signing in...", "جاري تسجيل الدخول...") : t("Log In", "تسجيل الدخول")}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Username", "اسم المستخدم")}</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="username" data-testid="input-register-username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("Password", "كلمة المرور")}</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="new-password" data-testid="input-register-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending} data-testid="button-register-submit">
                    {registerMutation.isPending ? t("Creating account...", "جاري إنشاء الحساب...") : t("Create Account", "إنشاء حساب")}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase text-muted-foreground bg-card px-2 w-fit mx-auto">
              {t("or", "أو")}
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGuest}
            data-testid="button-continue-guest"
          >
            <Users className="w-4 h-4" />
            {t("Continue as Guest", "المتابعة كضيف")}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {t("Guest data is stored locally only", "بيانات الضيف تُخزَّن محلياً فقط")}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

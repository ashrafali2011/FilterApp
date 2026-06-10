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
import { useLogin, useRegister, useForgotPassword, useResetPassword } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Droplets, LogIn, UserPlus, Users, Mail, ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(6, "At least 6 characters"),
});

const registerSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "At least 6 characters"),
});

const forgotEmailSchema = z.object({
  email: z.string().email("Valid email required"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits").regex(/^\d+$/, "Digits only"),
});

const newPasswordSchema = z.object({
  newPassword: z.string().min(6, "At least 6 characters"),
  confirmPassword: z.string().min(6, "At least 6 characters"),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type ForgotEmailForm = z.infer<typeof forgotEmailSchema>;
type OtpForm = z.infer<typeof otpSchema>;
type NewPasswordForm = z.infer<typeof newPasswordSchema>;

type ResetStep = "email" | "otp" | "password" | "done";

// ─── Slide animation ──────────────────────────────────────────────────────────

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.2 },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Login() {
  const [, setLocation] = useLocation();
  const { login, setAsGuest } = useAuth();
  const { toast } = useToast();
  const { language } = useI18n();
  const t = (en: string, ar: string) => language === "ar" ? ar : en;

  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const forgotMutation = useForgotPassword();
  const resetMutation = useResetPassword();

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { username: "", email: "", password: "" } });
  const forgotEmailForm = useForm<ForgotEmailForm>({ resolver: zodResolver(forgotEmailSchema), defaultValues: { email: "" } });
  const otpForm = useForm<OtpForm>({ resolver: zodResolver(otpSchema), defaultValues: { otp: "" } });
  const newPasswordForm = useForm<NewPasswordForm>({ resolver: zodResolver(newPasswordSchema), defaultValues: { newPassword: "", confirmPassword: "" } });

  const handleLogin = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: t("Welcome back!", "مرحباً بعودتك!") });
        setLocation("/");
      },
      onError: () => toast({ title: t("Invalid credentials", "بيانات غير صحيحة"), variant: "destructive" }),
    });
  };

  const handleRegister = (data: RegisterForm) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: t("Account created!", "تم إنشاء الحساب!") });
        setLocation("/");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Registration failed";
        toast({ title: msg === "Email already registered"
          ? t("Email already registered", "البريد الإلكتروني مسجّل مسبقاً")
          : t("Username already taken", "اسم المستخدم مأخوذ"),
          variant: "destructive" });
      },
    });
  };

  const handleForgotEmail = (data: ForgotEmailForm) => {
    setResetEmail(data.email);
    forgotMutation.mutate({ data: { email: data.email } }, {
      onSuccess: () => setResetStep("otp"),
      onError: () => setResetStep("otp"), // Always move to OTP step (anti-enumeration)
    });
  };

  const handleOtp = () => {
    // OTP is validated on the reset-password call; just advance the UI
    setResetStep("password");
  };

  const handleNewPassword = (data: NewPasswordForm) => {
    const otp = otpForm.getValues("otp");
    resetMutation.mutate(
      { data: { email: resetEmail, otp, newPassword: data.newPassword } },
      {
        onSuccess: () => {
          setResetStep("done");
          toast({ title: t("Password changed!", "تم تغيير كلمة المرور!") });
        },
        onError: () => toast({
          title: t("Invalid or expired OTP — try again", "رمز غير صحيح أو منتهي الصلاحية"),
          variant: "destructive",
        }),
      }
    );
  };

  const resetForgotFlow = () => {
    setShowForgot(false);
    setResetStep("email");
    setResetEmail("");
    forgotEmailForm.reset();
    otpForm.reset();
    newPasswordForm.reset();
  };

  // ─── Forgot-password panel ──────────────────────────────────────────────────

  if (showForgot) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
              <Droplets className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">AquaTrack</h1>
            <p className="text-muted-foreground text-sm mt-1">{t("Password Reset", "إعادة تعيين كلمة المرور")}</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {/* Steps indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {(["email", "otp", "password"] as ResetStep[]).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    resetStep === s ? "bg-primary text-primary-foreground"
                    : (["otp", "password", "done"].indexOf(resetStep) > i) ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}>{i + 1}</div>
                  {i < 2 && <div className={`w-8 h-0.5 ${(["otp", "password", "done"].indexOf(resetStep) > i) ? "bg-primary/40" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* Step 1 — Email */}
              {resetStep === "email" && (
                <motion.div key="email" {...slide}>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">{t("Enter your email", "أدخل بريدك الإلكتروني")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t("We'll send a 6-digit code to your registered email.", "سنرسل رمزاً مكوناً من 6 أرقام إلى بريدك المسجّل.")}
                  </p>
                  <Form {...forgotEmailForm}>
                    <form onSubmit={forgotEmailForm.handleSubmit(handleForgotEmail)} className="space-y-4">
                      <FormField control={forgotEmailForm.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Email", "البريد الإلكتروني")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" data-testid="input-forgot-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={forgotMutation.isPending} data-testid="button-forgot-send">
                        {forgotMutation.isPending ? t("Sending...", "جاري الإرسال...") : t("Send Code", "إرسال الرمز")}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Step 2 — OTP */}
              {resetStep === "otp" && (
                <motion.div key="otp" {...slide}>
                  <div className="flex items-center gap-2 mb-4">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">{t("Enter the code", "أدخل الرمز")}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {t("Check your email for a 6-digit code sent to:", "تحقق من بريدك للحصول على الرمز المرسل إلى:")}
                  </p>
                  <p className="text-sm font-medium text-primary mb-4 break-all">{resetEmail}</p>
                  <Form {...otpForm}>
                    <form onSubmit={otpForm.handleSubmit(handleOtp)} className="space-y-4">
                      <FormField control={otpForm.control} name="otp" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("6-digit code", "الرمز المكون من 6 أرقام")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              inputMode="numeric"
                              maxLength={6}
                              placeholder="000000"
                              className="text-center text-2xl tracking-[0.5em] font-mono"
                              data-testid="input-otp"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" data-testid="button-otp-next">
                        {t("Verify Code", "التحقق من الرمز")}
                      </Button>
                      <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => setResetStep("email")}>
                        {t("Resend code", "إعادة إرسال الرمز")}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Step 3 — New password */}
              {resetStep === "password" && (
                <motion.div key="password" {...slide}>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">{t("Set new password", "تعيين كلمة مرور جديدة")}</h2>
                  </div>
                  <Form {...newPasswordForm}>
                    <form onSubmit={newPasswordForm.handleSubmit(handleNewPassword)} className="space-y-4">
                      <FormField control={newPasswordForm.control} name="newPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("New Password", "كلمة المرور الجديدة")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" autoComplete="new-password" data-testid="input-new-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={newPasswordForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("Confirm Password", "تأكيد كلمة المرور")}</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" autoComplete="new-password" data-testid="input-confirm-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <Button type="submit" className="w-full" disabled={resetMutation.isPending} data-testid="button-reset-password">
                        {resetMutation.isPending ? t("Saving...", "جاري الحفظ...") : t("Change Password", "تغيير كلمة المرور")}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              )}

              {/* Done */}
              {resetStep === "done" && (
                <motion.div key="done" {...slide} className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-4">
                    <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h2 className="font-semibold text-lg mb-2">{t("Password changed!", "تم تغيير كلمة المرور!")}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{t("You can now log in with your new password.", "يمكنك الآن تسجيل الدخول بكلمة مرورك الجديدة.")}</p>
                  <Button className="w-full" onClick={resetForgotFlow} data-testid="button-back-to-login">
                    {t("Back to Login", "العودة لتسجيل الدخول")}
                  </Button>
                </motion.div>
              )}

            </AnimatePresence>

            {resetStep !== "done" && (
              <Button variant="ghost" size="sm" className="w-full mt-3 gap-1.5 text-muted-foreground" onClick={resetForgotFlow}>
                <ArrowLeft className="w-3.5 h-3.5" />
                {t("Back to login", "العودة لتسجيل الدخول")}
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Main login / register card ─────────────────────────────────────────────

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
            <Droplets className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">AquaTrack</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("Water filter maintenance tracker", "متتبع صيانة فلاتر المياه")}</p>
        </div>

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

            {/* Login tab */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <FormField control={loginForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Username", "اسم المستخدم")}</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="username" data-testid="input-login-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={loginForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Password", "كلمة المرور")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="current-password" data-testid="input-login-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-login-submit">
                    {loginMutation.isPending ? t("Signing in...", "جاري تسجيل الدخول...") : t("Log In", "تسجيل الدخول")}
                  </Button>
                  {/* Forgot password link */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowForgot(true)}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
                      data-testid="button-forgot-password"
                    >
                      {t("Forgot your password?", "نسيت كلمة المرور؟")}
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Register tab */}
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                  <FormField control={registerForm.control} name="username" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Username", "اسم المستخدم")}</FormLabel>
                      <FormControl>
                        <Input {...field} autoComplete="username" data-testid="input-register-username" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Email", "البريد الإلكتروني")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" data-testid="input-register-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={registerForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("Password", "كلمة المرور")}</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" autoComplete="new-password" data-testid="input-register-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
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

          <Button variant="outline" className="w-full gap-2" onClick={() => { setAsGuest(); setLocation("/"); }} data-testid="button-continue-guest">
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

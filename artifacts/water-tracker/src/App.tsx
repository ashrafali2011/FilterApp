import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ThemeProvider } from "@/hooks/use-theme";
import { I18nProvider } from "@/lib/i18n";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NewFilter from "@/pages/NewFilter";
import FilterDetail from "@/pages/FilterDetail";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";

function AdminRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user?.username !== "Admin") return <Redirect to="/" />;
  return <Admin />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/login" component={Login} />
        <Route path="/filters/new" component={NewFilter} />
        <Route path="/filters/:filterId" component={FilterDetail} />
        <Route path="/history" component={History} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={AdminRoute} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <I18nProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AuthProvider>
                <Router />
              </AuthProvider>
            </WouterRouter>
            <Toaster />
          </I18nProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

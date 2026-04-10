import DevPanelPage from "@/pages/DevPanelPage";
import DevReportsPage from "@/pages/DevReportsPage";
import DevAccessPage from "@/pages/DevAccessPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import Settings from "@/pages/Settings";
import NewCoachPage from "@/pages/NewCoachPage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import EditTrainingPage from "@/pages/EditTrainingPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CoachesPage from "@/pages/CoachesPage";
import CoachProfilePage from "@/pages/CoachProfilePage";
import EvaluationDetailPage from "@/pages/EvaluationDetailPage";
import TrainingPage from "@/pages/TrainingPage";
import NotFound from "@/pages/NotFound";
import EditCoachPage from "@/pages/EditCoachPage";
import EvaluationTemplatePage from "@/pages/EvaluationTemplatePage";
import EvaluationTemplateCreatePage from "@/pages/EvaluationTemplateCreatePage";
import EvaluationTemplateEditPage from "@/pages/EvaluationTemplateEditPage";
import { StudioProvider } from "@/contexts/StudioContext";
import EvaluationV2StartPage from "@/pages/EvaluationV2StartPage";
import EvaluationV2FormPage from "@/pages/EvaluationV2FormPage";
import StudiosPage from "@/pages/StudiosPage";
import { ThemeProvider } from "@/components/ui/theme-provider";
import DevUsersPage from "@/pages/DevUsersPage";
import ActionCenterPage from "@/pages/ActionCenterPage";
import HomePage from "@/pages/HomePage";
import PricingPage from "@/pages/pricing";
import TermsPage from "@/pages/TermsPage";
import PrivacyPage from "@/pages/PrivacyPage";
import BillingPage from "@/pages/BillingPage";
import SecurityPage from "@/pages/SecurityPage";
import AcceptableUsePage from "@/pages/AcceptableUsePage";
import StudioBillingPage from "@/pages/StudioBillingPage";
import SelfServeOnboardingPage from "@/pages/SelfServeOnboardingPage";


const queryClient = new QueryClient();

function RedirectToEvaluationV2() {
  const location = useLocation();

  return (
    <Navigate
      to={{
        pathname: "/evaluations-v2/new",
        search: location.search,
      }}
      replace
    />
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
  <ThemeProvider
    attribute="class"
    defaultTheme="dark"
    enableSystem={false}
    storageKey="coachmetric-theme"
  >
    <TooltipProvider>
      <BrowserRouter>
        <StudioProvider>
          <Sonner />

          <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/acceptable-use" element={<AcceptableUsePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <SelfServeOnboardingPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/dev/reports"
                element={
                  <ProtectedRoute requireDeveloper>
                    <DevReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dev"
                element={
                  <ProtectedRoute requireDeveloper>
                    <DevPanelPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dev/users"
                element={
                  <ProtectedRoute requireDeveloper>
                    <DevUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dev/access"
                element={
                  <ProtectedRoute requireDeveloper>
                    <DevAccessPage />
                  </ProtectedRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/actions" element={<ActionCenterPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/billing" element={<StudioBillingPage />} />

                <Route path="/coaches" element={<CoachesPage />} />
                <Route path="/coaches/new" element={<NewCoachPage />} />
                <Route path="/coaches/:id" element={<CoachProfilePage />} />
                <Route path="/coaches/:id/edit" element={<EditCoachPage />} />

                <Route path="/evaluations" element={<RedirectToEvaluationV2 />} />
                <Route path="/evaluations/new" element={<RedirectToEvaluationV2 />} />
                <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
                <Route path="/evaluations-v2/new" element={<EvaluationV2StartPage />} />
                <Route path="/evaluations-v2/:id" element={<EvaluationV2FormPage />} />

                <Route
                  path="/studios"
                  element={
                    <ProtectedRoute requireAdmin>
                      <StudiosPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/studios/:studioId/evaluation-template"
                  element={<EvaluationTemplatePage />}
                />
                <Route
                  path="/studios/:studioId/evaluation-templates"
                  element={<EvaluationTemplatePage />}
                />
                <Route
                  path="/studios/:studioId/evaluation-templates/new"
                  element={<EvaluationTemplateCreatePage />}
                />
                <Route
                  path="/studios/:studioId/evaluation-templates/:id/edit"
                  element={<EvaluationTemplateEditPage />}
                />

                <Route path="/training" element={<TrainingPage />} />
                <Route path="/training/:id/edit" element={<EditTrainingPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
                      </Routes>
        </StudioProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ThemeProvider>
</QueryClientProvider>
  );
}

export default App;

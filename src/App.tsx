import NewCoachPage from "@/pages/NewCoachPage";
import EditTrainingPage from "@/pages/EditTrainingPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
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
import PrivacyPage from "@/pages/PrivacyPage";
import TermsPage from "@/pages/TermsPage";
import SecurityPage from "@/pages/SecurityPage";
import BillingPage from "@/pages/BillingPage";
import AcceptableUsePage from "@/pages/AcceptableUsePage";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/acceptable-use" element={<AcceptableUsePage />} />
            <Route
              element={
                <StudioProvider>
                  <AppLayout />
                </StudioProvider>
              }
            >
              <Route path="/studios" element={<StudiosPage />} />
              <Route path="/" element={<Dashboard />} />

              <Route path="/coaches" element={<CoachesPage />} />
              <Route path="/coaches/new" element={<NewCoachPage />} />
              <Route path="/coaches/:id" element={<CoachProfilePage />} />
              <Route path="/coaches/:id/edit" element={<EditCoachPage />} />
              <Route
                path="/evaluations"
                element={<Navigate to="/evaluations-v2/new" replace />}
              />
              <Route
                path="/evaluations/new"
                element={<Navigate to="/evaluations-v2/new" replace />}
              />
              <Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
              <Route
                path="/evaluations-v2/new"
                element={<EvaluationV2StartPage />}
              />
              <Route
                path="/evaluations-v2/:id"
                element={<EvaluationV2FormPage />}
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
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

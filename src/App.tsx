import NewCoachPage from "@/pages/NewCoachPage";
import EditTrainingPage from "@/pages/EditTrainingPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import CoachesPage from "@/pages/CoachesPage";
import CoachProfilePage from "@/pages/CoachProfilePage";
import NewEvaluationPage from "@/pages/NewEvaluationPage";
import EvaluationDetailPage from "@/pages/EvaluationDetailPage";
import TrainingPage from "@/pages/TrainingPage";
import NotFound from "@/pages/NotFound";
import EditCoachPage from "@/pages/EditCoachPage";
import EvaluationTemplatePage from "@/pages/EvaluationTemplatePage";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/coaches" element={<CoachesPage />} />
            <Route path="/coaches/new" element={<NewCoachPage />} />
            <Route path="/coaches/:id" element={<CoachProfilePage />} />
           <Route path="/evaluations/new" element={<NewEvaluationPage />} />
<Route path="/evaluations/:id" element={<EvaluationDetailPage />} />
<Route path="/coaches/:id/edit" element={<EditCoachPage />} />
<Route
  path="/studios/:studioId/evaluation-template"
  element={<EvaluationTemplatePage />}
/>

{/* ✅ CORRETO */}
<Route path="/training" element={<TrainingPage />} />
            <Route path="/training/:id/edit" element={<EditTrainingPage />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
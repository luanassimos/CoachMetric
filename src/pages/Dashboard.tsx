import { useStudio } from "@/contexts/StudioContext";
import GlobalDashboard from "@/components/dashboard/GlobalDashboard";
import DashboardLocal from "@/pages/DashboardLocal";


export default function Dashboard() {
  const { selectedStudioId } = useStudio();

  if (selectedStudioId === "all") {
    return <GlobalDashboard />;
  }

  return <DashboardLocal />;
}
import OperationsSectionPage from "@/components/operations/OperationsSectionPage";

interface OperationsDashboardPageProps {
  isAdminMode?: boolean;
}

const OperationsDashboardPage = ({ isAdminMode = false }: OperationsDashboardPageProps) => (
  <OperationsSectionPage section="dashboard" isAdminMode={isAdminMode} />
);

export default OperationsDashboardPage;

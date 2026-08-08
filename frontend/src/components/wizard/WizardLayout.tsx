import { Outlet } from "react-router-dom";
import { WizardProvider } from "../../context/WizardContext";

export function WizardLayout() {
  return (
    <WizardProvider>
      <Outlet />
    </WizardProvider>
  );
}

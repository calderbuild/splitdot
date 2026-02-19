import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CreateGroup from "./pages/CreateGroup";
import GroupDetail from "./pages/GroupDetail";
import AddExpense from "./pages/AddExpense";
import Settlement from "./pages/Settlement";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/groups/new" element={<CreateGroup />} />
      <Route path="/groups/:id" element={<GroupDetail />} />
      <Route path="/groups/:id/expense" element={<AddExpense />} />
      <Route path="/groups/:id/settle" element={<Settlement />} />
    </Routes>
  );
}

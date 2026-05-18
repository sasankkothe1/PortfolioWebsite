import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/public/HomePage';
import CategoryPage from './pages/public/CategoryPage';
import SearchResultsPage from './pages/public/SearchResultsPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UploadPage from './pages/admin/UploadPage';
import Spinner from './components/ui/Spinner';

function AdminGuard({ children }) {
  const { user } = useAuth();
  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:slug" element={<CategoryPage />} />
            <Route path="/search" element={<SearchResultsPage />} />
          </Route>
          <Route path="/admin" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={<AdminGuard><AdminDashboard /></AdminGuard>}
          />
          <Route
            path="/admin/upload"
            element={<AdminGuard><UploadPage /></AdminGuard>}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

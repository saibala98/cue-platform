import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Spinner from './components/Spinner';
import DemoBadge from './components/demo/DemoBadge';
import DemoReset from './components/demo/DemoReset';
import { DEMO_MODE } from './demo/demoMode';
import Login from './pages/Login';
import DemoLogin from './pages/DemoLogin';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TrainingModules from './pages/TrainingModules';
import CoursePlayer from './pages/CoursePlayer';
import ModuleAdmin from './pages/ModuleAdmin';
import DocumentManager from './pages/DocumentManager';
import MentorAssignment from './pages/MentorAssignment';
import CollaborationChecklist from './pages/CollaborationChecklist';
import MenteeView from './pages/MenteeView';
import MentorView from './pages/MentorView';
import LeaderDashboard from './pages/LeaderDashboard';
import ComplianceDashboard from './pages/ComplianceDashboard';
import AuditLog from './pages/AuditLog';
import ModuleVersioning from './pages/ModuleVersioning';
import KnowledgeBuddy from './pages/KnowledgeBuddy';
import KnowledgeMapAdmin from './pages/KnowledgeMapAdmin';
import KnowledgeMapViewer from './pages/KnowledgeMapViewer';

function RootRedirect() {
  const { status } = useAuth();
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <Navigate to={status === 'authenticated' ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <DemoBadge />
        <DemoReset />
        <Routes>
          <Route path="/login" element={DEMO_MODE ? <DemoLogin /> : <Login />} />
          <Route path="/register" element={DEMO_MODE ? <Navigate to="/login" replace /> : <Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training"
            element={
              <ProtectedRoute roles={['new_joinee']}>
                <TrainingModules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/training/:moduleId"
            element={
              <ProtectedRoute roles={['new_joinee']}>
                <CoursePlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/module-admin"
            element={
              <ProtectedRoute roles={['people_leader']}>
                <ModuleAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/document-manager"
            element={
              <ProtectedRoute roles={['people_leader']}>
                <DocumentManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentor-assignment"
            element={
              <ProtectedRoute roles={['people_leader']}>
                <MentorAssignment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-buddy"
            element={
              <ProtectedRoute roles={['new_joinee']}>
                <KnowledgeBuddy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-map-admin"
            element={
              <ProtectedRoute roles={['people_leader']}>
                <KnowledgeMapAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-map"
            element={
              <ProtectedRoute roles={['new_joinee']}>
                <KnowledgeMapViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentee-view"
            element={
              <ProtectedRoute roles={['new_joinee']}>
                <MenteeView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mentor-view"
            element={
              <ProtectedRoute roles={['mentor']}>
                <MentorView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collaboration-checklist/:assignmentId"
            element={
              <ProtectedRoute roles={['mentor', 'new_joinee']}>
                <CollaborationChecklist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leader-dashboard"
            element={
              <ProtectedRoute roles={['people_leader']}>
                <LeaderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance-dashboard"
            element={
              <ProtectedRoute roles={['compliance_admin']}>
                <ComplianceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-log"
            element={
              <ProtectedRoute roles={['compliance_admin']}>
                <AuditLog />
              </ProtectedRoute>
            }
          />
          <Route
            path="/module-versioning"
            element={
              <ProtectedRoute roles={['compliance_admin']}>
                <ModuleVersioning />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';
import { deleteExpiredEvents } from './services/expiredEventsService';

// Pages
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import ClubDashboard from './pages/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import OAuthCallback from './pages/OAuthCallback';

// Styles
import './App.css';

function App() {
  // Clean up expired events when app loads
  useEffect(() => {
    const cleanupExpiredEvents = async () => {
      try {
        const result = await deleteExpiredEvents();
        if (result.deletedCount > 0) {
          console.log(`✓ Auto-cleanup: Deleted ${result.deletedCount} expired event(s)`);
        }
      } catch (error) {
        console.warn('Auto-cleanup of expired events failed:', error);
        // Don't block app loading if cleanup fails
      }
    };

    cleanupExpiredEvents();

    // Also set up periodic cleanup every 24 hours
    const cleanupInterval = setInterval(cleanupExpiredEvents, 24 * 60 * 60 * 1000);

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <>
      <Toast />
      <Router>
        <Routes>
          {/* OAuth callback - public route without navbar */}
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          
          {/* Auth page doesn't have navbar */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* All other routes have navbar via Layout */}
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/home" element={<Home />} />
                  
                  <Route
                    path="/student-dashboard/*"
                    element={
                      <ProtectedRoute requiredRole="student">
                        <Routes>
                          <Route path="/" element={<StudentDashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route
                    path="/club-dashboard/*"
                    element={
                      <ProtectedRoute requiredRole="club">
                        <Routes>
                          <Route path="/" element={<ClubDashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/club-dashboard" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route
                    path="/admin-dashboard/*"
                    element={
                      <ProtectedRoute requiredRole="admin">
                        <Routes>
                          <Route path="/" element={<AdminDashboard />} />
                          <Route path="/profile" element={<Profile />} />
                          <Route path="*" element={<Navigate to="/admin-dashboard" replace />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />
                  
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;

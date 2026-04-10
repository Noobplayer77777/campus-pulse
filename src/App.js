import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Toast from './components/Toast';

// Pages
import AuthPage from './pages/AuthPage';
import Home from './pages/Home';
import StudentDashboard from './pages/StudentDashboard';
import ClubDashboard from './pages/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';

// Styles
import './App.css';

function App() {
  return (
    <>
      <Toast />
      <Router>
        <Routes>
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

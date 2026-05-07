import React, { useContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import './App.css';

// Lazy load components to massively improve performance and Lighthouse score!
const ChatApp = lazy(() => import('./components/ChatApp'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useContext(AuthContext);
  
  if (loading) return <div style={{color:'white', display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>Loading...</div>;
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Loading fallback for lazy components
const PageLoader = () => (
  <div style={{color:'var(--text-secondary)', display:'flex', justifyContent:'center', alignItems:'center', height:'100vh'}}>
    Loading...
  </div>
);

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ChatApp />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Suspense>
  );
}

export default App;

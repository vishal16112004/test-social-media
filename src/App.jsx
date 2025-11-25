import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import CreatePost from "./pages/CreatePost";
import Profile from "./pages/Profile";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white">Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  // Check if profile is complete
  if (user.isProfileComplete === false) {
    // If not complete, redirect to profile page with setup param
    // But allow access to the profile page itself to avoid infinite loop
    const isProfilePage = window.location.pathname.startsWith(`/profile/${user.uid}`);
    if (!isProfilePage) {
      return <Navigate to={`/profile/${user.uid}?setup=true`} />;
    }
  }

  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white">Loading...</div>;

  return !user ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/signup" element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          } />
          <Route path="/" element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          } />
          <Route path="/create" element={
            <PrivateRoute>
              <CreatePost />
            </PrivateRoute>
          } />
          <Route path="/profile/:uid" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />
          <Route path="/search" element={
            <PrivateRoute>
              <Search />
            </PrivateRoute>
          } />
          <Route path="/notifications" element={
            <PrivateRoute>
              <Notifications />
            </PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

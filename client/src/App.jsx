import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Loader from './components/Loader.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';

const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const UserProfile = lazy(() => import('./pages/UserProfile.jsx'));
const Explore = lazy(() => import('./pages/Explore.jsx'));
const Matches = lazy(() => import('./pages/Matches.jsx'));
const Blueprint = lazy(() => import('./pages/Blueprint.jsx'));
const Requests = lazy(() => import('./pages/Requests.jsx'));
const Chat = lazy(() => import('./pages/Chat.jsx'));
const Sessions = lazy(() => import('./pages/Sessions.jsx'));
const LearningQuest = lazy(() => import('./pages/LearningQuest.jsx'));
const SkillPassport = lazy(() => import('./pages/SkillPassport.jsx'));
const Notifications = lazy(() => import('./pages/Notifications.jsx'));
const Rooms = lazy(() => import('./pages/Rooms.jsx'));
const Room = lazy(() => import('./pages/Room.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

function PublicShell() {
  return (
    <div className="public-shell">
      <Navbar />
      <main className="container public-main"><Outlet /></main>
      <Footer />
    </div>
  );
}

/** Explore & public profiles work for guests and inside the app shell when signed in. */
function HybridShell() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loader full />;
  return isAuthenticated ? <AppLayout /> : <PublicShell />;
}

function GuestOnly({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Suspense fallback={<Loader full />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

        <Route element={<HybridShell />}>
          <Route path="/explore" element={<Explore />} />
          <Route path="/users/:id" element={<UserProfile />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/blueprint/:userId" element={<Blueprint />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/chat/:connectionId" element={<Chat />} />
            <Route path="/sessions" element={<Sessions />} />
            <Route path="/quests" element={<LearningQuest />} />
            <Route path="/passport" element={<SkillPassport />} />
            <Route path="/passport/:userId" element={<SkillPassport />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:id" element={<Room />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute admin />}>
          <Route element={<AppLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

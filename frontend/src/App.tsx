import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LibraryPage from './pages/LibraryPage';
import DashboardPage from './pages/DashboardPage';
import QuizBuilderPage from './pages/QuizBuilderPage';
import ProtectedRoute from './components/ProtectedRoute';
import ReportsPage from './pages/ReportsPage';
import DiscoverPage from './pages/DiscoverPage';
import GameJoinPage from './pages/GameJoinPage';
import GamePlayerPage from './pages/GamePlayerPage';
import GameHostPage from './pages/GameHostPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <LibraryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/new"
        element={
          <ProtectedRoute>
            <QuizBuilderPage mode="create" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:id/edit"
        element={
          <ProtectedRoute>
            <QuizBuilderPage mode="edit" />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <DiscoverPage />
          </ProtectedRoute>
        }
      />
      <Route path="/game/join" element={<GameJoinPage />} />
      <Route path="/game/:pin/play" element={<GamePlayerPage />} />
      <Route
        path="/game/:pin/host"
        element={
          <ProtectedRoute>
            <GameHostPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

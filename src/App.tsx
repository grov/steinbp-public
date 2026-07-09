import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ManagerRoute, ProfileRoute, RoleRedirect } from './components/ProtectedRoute'

import { LoginScreen } from './screens/LoginScreen'
import { PlayerRegistrationScreen } from './screens/PlayerRegistrationScreen'
import { PendingApprovalScreen } from './screens/PendingApprovalScreen'
import { PlayerProfileScreen } from './screens/PlayerProfileScreen'

import { HomeScreen } from './screens/HomeScreen'
import { CreateTournamentScreen } from './screens/CreateTournamentScreen'
import { RegisterTeamsScreen } from './screens/RegisterTeamsScreen'
import { TournamentDashboard } from './screens/TournamentDashboard'
import { PublicDisplayScreen } from './screens/PublicDisplayScreen'
import { PalmaresScreen } from './screens/PalmaresScreen'
import { ChallengesScreen } from './screens/ChallengesScreen'
import { NewChallengeScreen } from './screens/NewChallengeScreen'

export function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* ── Public ──────────────────────────────────── */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<PlayerRegistrationScreen />} />
          <Route path="/display/:id" element={<PublicDisplayScreen />} />
          <Route path="/player/:id" element={<PlayerProfileScreen />} />

          {/* Redirige selon le rôle après connexion */}
          <Route path="/" element={<RoleRedirect />} />

          {/* ── Joueur connecté ──────────────────────────── */}
          <Route path="/pending" element={<PendingApprovalScreen />} />
          <Route
            path="/profile"
            element={<ProfileRoute><PlayerProfileScreen /></ProfileRoute>}
          />
          <Route
            path="/palmares"
            element={<ProfileRoute><PalmaresScreen /></ProfileRoute>}
          />
          <Route
            path="/challenges"
            element={<ProfileRoute><ChallengesScreen /></ProfileRoute>}
          />
          <Route
            path="/challenges/new"
            element={<ProfileRoute><NewChallengeScreen /></ProfileRoute>}
          />

          {/* ── Admin + Organisateur ─────────────────────── */}
          <Route path="/admin" element={<ManagerRoute><HomeScreen /></ManagerRoute>} />
          <Route path="/create" element={<ManagerRoute><CreateTournamentScreen /></ManagerRoute>} />
          <Route
            path="/tournament/:id/register"
            element={<ManagerRoute><RegisterTeamsScreen /></ManagerRoute>}
          />
          <Route
            path="/tournament/:id"
            element={<ManagerRoute><TournamentDashboard /></ManagerRoute>}
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
    </ThemeProvider>
  )
}

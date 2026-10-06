import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './layouts/AppShell'
import { DeanQueue } from './pages/dean/DeanQueue'
import { DeanRecord } from './pages/dean/DeanRecord'
import { ActivityLog } from './pages/dean/ActivityLog'
import { DeanCurricula } from './pages/dean/DeanCurricula'
import { DeanStudent } from './pages/dean/DeanStudent'
import { DeanStudents } from './pages/dean/DeanStudents'
import { SampleReport } from './pages/dean/SampleReport'
import { SignIn } from './pages/SignIn'
import { StudentAssistant } from './pages/student/StudentAssistant'
import { StudentOverview } from './pages/student/StudentOverview'
import { StudentGrades } from './pages/student/StudentGrades'
import { StudentPrint } from './pages/student/StudentPrint'
import { StudentProgress } from './pages/student/StudentProgress'
import { AppStoreProvider, useStore } from './store/AppStore'
import { LiveSession } from './firebase/LiveSession'
import type { Role } from './domain/types'

const HOME: Record<Role, string> = { student: '/student', dean: '/dean' }

/** Role-based access: each role only reaches its own routes. */
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { state } = useStore()
  if (!state.session) return <Navigate to="/" replace />
  if (state.session.role !== role) return <Navigate to={HOME[state.session.role]} replace />
  return <>{children}</>
}

function Entry() {
  const { state } = useStore()
  return state.session ? <Navigate to={HOME[state.session.role]} replace /> : <SignIn />
}

export default function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <LiveSession>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/student/print" element={<RequireRole role="student"><StudentPrint /></RequireRole>} />
          <Route element={<RequireRole role="student"><AppShell /></RequireRole>}>
            <Route path="/student" element={<StudentOverview />} />
            <Route path="/student/grades" element={<StudentGrades />} />
            <Route path="/student/progress" element={<StudentProgress />} />
            <Route path="/student/assistant" element={<StudentAssistant />} />
          </Route>
          <Route path="/dean/students/:id/print" element={<RequireRole role="dean"><StudentPrint /></RequireRole>} />
          <Route path="/dean/sample-report/:id" element={<RequireRole role="dean"><SampleReport /></RequireRole>} />
          <Route element={<RequireRole role="dean"><AppShell /></RequireRole>}>
            <Route path="/dean" element={<DeanQueue />} />
            <Route path="/dean/students/:id" element={<DeanRecord />} />
            <Route path="/dean/students" element={<DeanStudents />} />
            <Route path="/dean/students/:id/profile" element={<DeanStudent />} />
            <Route path="/dean/curricula" element={<DeanCurricula />} />
            <Route path="/dean/activity" element={<ActivityLog />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </LiveSession>
      </BrowserRouter>
    </AppStoreProvider>
  )
}

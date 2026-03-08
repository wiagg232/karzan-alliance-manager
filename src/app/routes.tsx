import { lazy, Suspense } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';

const Login = lazy(() => import('@features/auth/pages/Login'));
const GuildDashboard = lazy(() => import('@features/guild/pages/GuildDashboard'));
const AdminDashboard = lazy(() => import('@features/admin/pages/AdminDashboard'));
const TeamManagementPage = lazy(() => import('@features/member/pages/TeamManagementPage'));
const AllianceRaidRecord = lazy(() => import('@features/raid/pages/AllianceRaidRecord'));
const ApplicationMailbox = lazy(() => import('@features/mailbox/pages/ApplicationMailbox'));
const ArcadePage = lazy(() => import('@features/arcade/pages/Arcade'));
const Toolbox = lazy(() => import('@features/toolbox/pages/Toolbox'));

const GuildDashboardWrapper = () => {
    const { guildId } = useParams<{ guildId: string }>();
    return <GuildDashboard guildId={guildId || ''} />;
};

export default function AppRoutes() {

    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-xl">載入中...</div>}>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/guild/:guildId" element={<GuildDashboardWrapper />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/team" element={<TeamManagementPage />} />
                <Route path="/raid" element={<AllianceRaidRecord />} />
                <Route path="/mailbox" element={<ApplicationMailbox />} />
                <Route path="/arcade" element={<ArcadePage />} />
                <Route path="/toolbox" element={<Toolbox />} />
            </Routes>
        </Suspense>
    );
}
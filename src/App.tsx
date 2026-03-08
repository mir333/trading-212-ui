import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/layout';
import DashboardPage from '@/pages/dashboard';
import PortfolioPage from '@/pages/portfolio';
import StockDetailPage from '@/pages/stock-detail';
import SettingsPage from '@/pages/settings';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/hooks/use-theme';
import { YahooQueueProvider } from '@/hooks/use-yahoo-queue';

function AppInner() {
  useTheme();
  return (
    <YahooQueueProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="stock/:ticker" element={<StockDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </YahooQueueProvider>
  );
}

export default function App() {
  return <AppInner />;
}

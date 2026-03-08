import { HashRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { ThemeProvider } from '@app/providers/ThemeContext';
import { AppProvider } from '@/store';
import Header from '@shared/ui/Header';
import Footer from '@shared/ui/Footer';
import Toaster from '@shared/ui/Toast';

function App() {
  return (
    <AppProvider>
      <ThemeProvider>
        <HashRouter>
          <div className="flex min-h-screen flex-col bg-zinc-950 text-white">
            <Header />
            <main className="flex-1">
              <AppRoutes />
            </main>
            <Footer />
            <Toaster />
          </div>
        </HashRouter>
      </ThemeProvider>
    </AppProvider>
  );
}

export default App;
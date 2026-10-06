import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import Header from './components/Header';
import WordCloud from './pages/WordCloud';
import Karaoke from './pages/Karaoke';
import Admin from './pages/Admin';
import Landing from './pages/Landing';
import Welcome from './pages/Welcome';
import { GenerationProvider } from './store/GenerationContext';

function AppShell() {
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        .app-shell {
          display: grid;
          grid-template-rows: 64px 1fr;
          min-height: 100vh;
          width: 100%;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .app-shell > header { padding: 0 12px !important; }
        }
      `}</style>
      <BrowserRouter>
      <GenerationProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route element={<AppShell />}>
          <Route path="/create" element={<WordCloud />} />
          <Route path="/karaoke" element={<Karaoke />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
      </GenerationProvider>
      </BrowserRouter>
    </>
  );
}

export default App;

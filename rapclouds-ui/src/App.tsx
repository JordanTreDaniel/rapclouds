import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import WordCloud from './pages/WordCloud';
import Karaoke from './pages/Karaoke';
import Admin from './pages/Admin';
import { GenerationProvider } from './store/GenerationContext';

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
      <div className="app-shell">
        <Header />
        <Routes>
          <Route path="/" element={<WordCloud />} />
          <Route path="/karaoke" element={<Karaoke />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
      </GenerationProvider>
      </BrowserRouter>
    </>
  );
}

export default App;

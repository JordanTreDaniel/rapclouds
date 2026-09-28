import Sidebar from '../components/Sidebar';
import MainDisplay from '../components/MainDisplay';
import GalleryStrip from '../components/GalleryStrip';
import InputSource from '../components/sidebar/InputSource';
import Typography from '../components/sidebar/Typography';
import LayoutShape from '../components/sidebar/LayoutShape';
import Phrases from '../components/sidebar/Phrases';
import Colors from '../components/sidebar/Colors';
import Generation from '../components/sidebar/Generation';
import Contour from '../components/sidebar/Contour';
import { GenerateButton } from '../components/GenerateButton';

export default function WordCloud() {
  return (
    <>
        <style>{`
          .wordcloud-page {
            display: grid;
            grid-template-rows: 1fr 220px;
            grid-template-columns: 1fr 380px;
            grid-template-areas:
              "main sidebar"
              "gallery gallery";
            min-height: calc(100vh - 64px);
          }
          ::-webkit-scrollbar { width: 6px; }
          ::-webkit-scrollbar-track { background: #0a0a0a; }
          ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
          @media (max-width: 1024px) {
            .wordcloud-page {
              grid-template-columns: 1fr;
              grid-template-rows: 1fr auto 220px;
              grid-template-areas:
                "main"
                "sidebar"
                "gallery";
            }
            .sidebar-responsive { border-left: none; border-top: 1px solid #2a2a2a; max-height: 50vh; width: 100% !important; }
            .header-export { display: none; }
          }
          @media (max-width: 640px) {
            .wordcloud-page > main { padding: 12px !important; }
            .sidebar-responsive { padding: 12px !important; }
            .wordcloud-page > section { padding: 12px !important; }
          }
        `}</style>
    <div className="wordcloud-page">
        <MainDisplay />
        <Sidebar>
          <div className="flex flex-col gap-4 text-text">
            <InputSource />
            <Typography />
            <LayoutShape />
            <Phrases />
            <Colors />
            <Generation />
            <Contour />
          </div>
          <GenerateButton />
        </Sidebar>
        <GalleryStrip />
      </div>
    </>
  );
}

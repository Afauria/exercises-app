import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ExamHome } from './pages/ExamHome';
import { ExamQuiz } from './pages/ExamQuiz';
import { ExamResult } from './pages/ExamResult';
import { PracticeHome } from './pages/PracticeHome';
import { PracticeQuiz } from './pages/PracticeQuiz';
import { Stats } from './pages/Stats';
import { WrongBook } from './pages/WrongBook';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/practice" replace />} />
        <Route path="/practice" element={<PracticeHome />} />
        <Route path="/practice/quiz" element={<PracticeQuiz />} />
        <Route path="/exam" element={<ExamHome />} />
        <Route path="/exam/quiz" element={<ExamQuiz />} />
        <Route path="/exam/result" element={<ExamResult />} />
        <Route path="/wrong" element={<WrongBook />} />
        <Route path="/stats" element={<Stats />} />
      </Route>
    </Routes>
  );
}

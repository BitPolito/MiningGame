import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ModalCloseButton from './components/ModalCloseButton';
import { useLocale } from './i18n/LocaleContext';
import easyGuideEn from './guides/EasyGuide.md?raw';
import easyGuideIt from './guides/EasyGuide.it.md?raw';
import hardGuideEn from './guides/HardGuide.md?raw';
import hardGuideIt from './guides/HardGuide.it.md?raw';

const guides = {
  easy: { en: easyGuideEn, it: easyGuideIt },
  hard: { en: hardGuideEn, it: hardGuideIt },
};

export default function HowToPlay({ initialDifficulty = 'easy', difficulty, onClose }) {
  const { locale, tr } = useLocale();
  const startMode = difficulty ?? initialDifficulty;
  const [activeMode, setActiveMode] = useState(startMode === 'hard' ? 'hard' : 'easy');

  const guideContent = guides[activeMode][locale] ?? guides[activeMode].en;

  return (
    <div className="modal-overlay bp-rules-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="bp-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-rules-modal-title"
      >
        <header className="bp-rules-modal__header">
          <h2 id="bp-rules-modal-title" className="bp-rules-modal__title">
            {tr('rulesGuideTitle')}
          </h2>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div className="bp-rules-modal__tabs" role="tablist" aria-label={tr('rulesTabsAria')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'easy'}
            className={`bp-rules-modal__tab${activeMode === 'easy' ? ' bp-rules-modal__tab--active' : ''}`}
            onClick={() => setActiveMode('easy')}
          >
            {tr('difficultyEasy')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'hard'}
            className={`bp-rules-modal__tab${activeMode === 'hard' ? ' bp-rules-modal__tab--active' : ''}`}
            onClick={() => setActiveMode('hard')}
          >
            {tr('difficultyHard')}
          </button>
        </div>

        <div className="bp-rules-modal__body readme-text how-to-play-body" role="tabpanel">
          <ReactMarkdown>{guideContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

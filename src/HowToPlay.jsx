import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ModalCloseButton from './components/ModalCloseButton';
import { useLocale } from './i18n/LocaleContext';
import { useModalFocus } from './hooks/useModalFocus';
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
  const dialogRef = useModalFocus(true, onClose);
  const bodyRef = useRef(null);

  const guideContent = guides[activeMode][locale] ?? guides[activeMode].en;
  const selectMode = (mode) => {
    setActiveMode(mode);
    bodyRef.current?.scrollTo({ top: 0 });
  };
  const handleTabKeyDown = (event) => {
    const modes = ['easy', 'hard'];
    const current = modes.indexOf(activeMode);
    let next = null;
    if (event.key === 'ArrowRight') next = modes[(current + 1) % modes.length];
    if (event.key === 'ArrowLeft') next = modes[(current - 1 + modes.length) % modes.length];
    if (event.key === 'Home') next = modes[0];
    if (event.key === 'End') next = modes[modes.length - 1];
    if (!next) return;
    event.preventDefault();
    selectMode(next);
    dialogRef.current?.querySelector(`#rules-tab-${next}`)?.focus();
  };

  return (
    <div className="modal-overlay bp-rules-modal-overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="bp-rules-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bp-rules-modal-title"
      >
        <header className="bp-rules-modal__header">
          <div className="bp-rules-modal__heading">
            <h2 id="bp-rules-modal-title" className="bp-rules-modal__title">
              {tr('rulesGuideTitle')}
            </h2>
            <p>{tr('rulesGuideSubtitle')}</p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </header>

        <div className="bp-rules-modal__tabs" role="tablist" aria-label={tr('rulesTabsAria')}>
          <button
            type="button"
            id="rules-tab-easy"
            role="tab"
            aria-selected={activeMode === 'easy'}
            aria-controls="rules-panel"
            tabIndex={activeMode === 'easy' ? 0 : -1}
            className={`bp-rules-modal__tab${activeMode === 'easy' ? ' bp-rules-modal__tab--active' : ''}`}
            onClick={() => selectMode('easy')}
            onKeyDown={handleTabKeyDown}
          >
            <span>{tr('difficultyEasy')}</span>
            <small>{tr('difficultyEasyDesc')}</small>
          </button>
          <button
            type="button"
            id="rules-tab-hard"
            role="tab"
            aria-selected={activeMode === 'hard'}
            aria-controls="rules-panel"
            tabIndex={activeMode === 'hard' ? 0 : -1}
            className={`bp-rules-modal__tab${activeMode === 'hard' ? ' bp-rules-modal__tab--active' : ''}`}
            onClick={() => selectMode('hard')}
            onKeyDown={handleTabKeyDown}
          >
            <span>{tr('difficultyHard')}</span>
            <small>{tr('difficultyHardDesc')}</small>
          </button>
        </div>

        <div
          ref={bodyRef}
          id="rules-panel"
          className="bp-rules-modal__body readme-text how-to-play-body"
          role="tabpanel"
          aria-labelledby={`rules-tab-${activeMode}`}
          tabIndex="0"
        >
          <ReactMarkdown>{guideContent}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

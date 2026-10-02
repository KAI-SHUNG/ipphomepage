import { useEffect, useId, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Lightbulb, RotateCcw, Sparkles, Undo2, X } from 'lucide-react';
import { EMPTY_BOARD, TARGETS, matchesTarget, solve, type Board } from './rules';
import { createGame, gameReducer, type Action } from './state';
import './game.css';

function TargetPreview({ rows }: { rows: Board }) {
  return <span className="lo-preview" aria-hidden="true">{Array.from({ length: 25 }, (_, cell) => (
    <i key={cell} className={rows[Math.floor(cell / 5)] & (1 << (cell % 5)) ? 'is-on' : ''} />
  ))}</span>;
}

export default function LightsOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [game, dispatch] = useReducer(gameReducer, undefined, createGame);
  const [hints, setHints] = useState<(number | null)[]>([null, null, null]);
  const [activeCells, setActiveCells] = useState([0, 0, 0]);
  const [announcement, setAnnouncement] = useState('');
  const [activePanel, setActivePanel] = useState(0);
  const completed = game.map((panel, index) => matchesTarget(panel.rows, TARGETS[index].rows));
  const completeCount = completed.filter(Boolean).length;
  const total = game.reduce((steps, panel) => steps + panel.clicks.length, 0);
  const progress = completeCount === 3 ? 'I++ 已点亮' : `${completeCount} / 3 已点亮`;

  useEffect(() => {
    const modal = dialog.current!;
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      modal.close();
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [open]);

  function act(action: Action) {
    dispatch(action);
    setHints(previous => previous.map((hint, index) => index === action.panel ? null : hint));
    setAnnouncement(action.type === 'reset' ? `第 ${action.panel + 1} 块棋盘已重置。` : '');
  }

  function hint(panel: number) {
    const next = solve(game[panel].rows, TARGETS[panel].rows)?.[0];
    if (next === undefined) return;
    setHints(previous => previous.map((value, index) => index === panel ? next : value));
    setAnnouncement(`第 ${panel + 1} 块棋盘：试试第 ${Math.floor(next / 5) + 1} 行、第 ${next % 5 + 1} 列的格子。`);
  }

  function navigate(event: KeyboardEvent<HTMLButtonElement>, panel: number, cell: number) {
    const row = Math.floor(cell / 5), col = cell % 5;
    const next = event.key === 'ArrowUp' ? Math.max(0, row - 1) * 5 + col
      : event.key === 'ArrowDown' ? Math.min(4, row + 1) * 5 + col
      : event.key === 'ArrowLeft' ? row * 5 + Math.max(0, col - 1)
      : event.key === 'ArrowRight' ? row * 5 + Math.min(4, col + 1)
      : event.key === 'Home' ? row * 5 : event.key === 'End' ? row * 5 + 4 : null;
    if (next === null) return;
    event.preventDefault();
    dialog.current?.querySelector<HTMLButtonElement>(`[data-panel="${panel}"] .lo-cell[data-cell="${next}"]`)?.focus();
  }

  return (
    <dialog ref={dialog} className="lights-out" aria-labelledby={`${id}-title`} aria-describedby={`${id}-rules`}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([tabindex="-1"])'))
          .filter(button => button.getClientRects().length > 0);
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      }}>
      <div className="lo-content">
        <header className="lo-header">
          <div className="lo-heading">
            <h2 id={`${id}-title`}>点亮 <span>I++</span></h2>
            <span className={`lo-progress ${completeCount === 3 ? 'is-complete' : ''}`} role="status"
              aria-label={`${progress}，共 ${total} 步`} title={`共 ${total} 步`}>
              {completeCount === 3 && <Sparkles size={14} aria-hidden="true" />}{progress}
            </span>
          </div>
          <button type="button" className="lo-close" aria-label="关闭游戏" onClick={onClose}><X size={22} aria-hidden="true" /></button>
        </header>
        <p className="lo-intro" id={`${id}-rules`}>点击翻转自身与上下左右，拼出 <strong>I++</strong>，其余格子熄灭。</p>
        <div className="lo-switcher" role="group" aria-label="切换棋盘">
          {TARGETS.map((target, index) => <button type="button" key={index} aria-pressed={activePanel === index}
            aria-label={`第 ${index + 1} 块棋盘 ${target.letter}`} onClick={() => setActivePanel(index)}>
            <span>{target.letter}</span>{completed[index] && <Check size={13} aria-hidden="true" />}
          </button>)}
        </div>
        <div className="lo-panels">
          {game.map((panel, index) => (
            <section className={`lo-panel lo-panel-${index} ${activePanel === index ? 'is-active' : ''}`} key={index} data-panel={index} data-complete={completed[index]} aria-labelledby={`${id}-index-${index} ${id}-panel-${index}`}>
              <div className="lo-panel-header">
                <div>
                  <span className="lo-panel-index" id={`${id}-index-${index}`}>0{index + 1} / 5 × 5</span>
                  <h3 id={`${id}-panel-${index}`}><span>{TARGETS[index].letter}</span><span className="lo-panel-label">{completed[index] && <Check size={13} aria-hidden="true" />} {panel.clicks.length} 步</span></h3>
                </div>
                <div className="lo-target"><TargetPreview rows={TARGETS[index].rows} /><span>目标图案</span></div>
              </div>
              <div className="lo-grid" role="grid" aria-label={`第 ${index + 1} 块棋盘，目标 ${TARGETS[index].letter}`}>
                {EMPTY_BOARD.map((_, row) => (
                  <div className="lo-row" role="row" key={row}>
                    {Array.from({ length: 5 }, (_, col) => {
                      const cell = row * 5 + col, lit = Boolean(panel.rows[row] & (1 << col));
                      return <div role="gridcell" key={col}>
                        <button type="button" className={`lo-cell ${lit ? 'is-on' : ''} ${hints[index] === cell ? 'is-hint' : ''}`}
                          data-cell={cell} aria-pressed={lit} aria-disabled={completed[index]}
                          aria-label={`第 ${row + 1} 行，第 ${col + 1} 列，目标${TARGETS[index].rows[row] & (1 << col) ? '亮' : '暗'}`}
                          tabIndex={activeCells[index] === cell ? 0 : -1}
                          onFocus={() => setActiveCells(previous => previous.map((value, i) => i === index ? cell : value))}
                          onKeyDown={event => navigate(event, index, cell)}
                          onClick={() => act({ type: 'click', panel: index, cell })}>
                          <span aria-hidden="true">{hints[index] === cell ? '?' : lit ? '+' : '·'}</span>
                        </button>
                      </div>;
                    })}
                  </div>
                ))}
              </div>
              <div className="lo-controls">
                <button type="button" onClick={() => act({ type: 'undo', panel: index })} disabled={!panel.clicks.length}><Undo2 size={16} aria-hidden="true" />撤销</button>
                <button type="button" onClick={() => act({ type: 'reset', panel: index })} disabled={!panel.clicks.length}><RotateCcw size={16} aria-hidden="true" />重置</button>
                <button type="button" className="lo-hint-button" onClick={() => hint(index)} disabled={completed[index]}><Lightbulb size={16} aria-hidden="true" />提示</button>
              </div>
            </section>
          ))}
        </div>
        <div className="sr-only" role="status">{announcement}</div>
      </div>
    </dialog>
  );
}

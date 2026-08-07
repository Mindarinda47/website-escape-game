import { completionCopy, contentPageNames } from "../content/copy";
import type { ContentPageId } from "../state/types";

type Props = {
  page: ContentPageId;
  onClose: () => void;
  onHome: () => void;
};

export function CompletionModal({ page, onClose, onHome }: Props) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="completion-modal" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <span className="eyebrow">{contentPageNames[page]}</span>
        <h2 id="completion-title">페이지 탐색 완료</h2>
        <p>이 페이지의 문자 단서를 모두 발견했습니다.</p>
        <blockquote>{completionCopy[page]}</blockquote>
        <div className="modal-actions">
          <button className="button primary" onClick={onHome}>포털로 돌아가기</button>
          <button className="button ghost" onClick={onClose}>조금 더 둘러보기</button>
        </div>
      </section>
    </div>
  );
}

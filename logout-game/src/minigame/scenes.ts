import type { Checkpoint } from "../state/types";

export const sceneCopy: Record<Checkpoint, { title: string; objective: string }> = {
  start: { title: "입구 방", objective: "움직이고 공격해 그림자 셋을 지나가세요." },
  "light-room": { title: "빛의 방", objective: "Space로 빛의 스위치를 두 번 깨운 뒤 활 앞에서 E를 누르세요." },
  boss: { title: "보스 방", objective: "그림자 수문장을 세 번 공격하세요." },
  rescue: { title: "구출 방", objective: "기다리는 사람에게 다가가 E를 누르세요." },
  clear: { title: "모험 완료", objective: "작은 모험의 보상은 바깥에도 남습니다." },
};

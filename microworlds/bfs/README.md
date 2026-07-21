# 마이크로월드 예시 — BFS 타임라인 디버거

그래프 BFS(너비 우선 탐색)를 **타임라인으로 스크럽**하며, 큐·방문·거리 상태가 어떻게 변하는지
직관적으로 관찰하는 시각적 디버거입니다. 축 2(마이크로월드)의 end-to-end 예시입니다.

![preview](preview.png)

## 바로 보기
`index.html`을 **브라우저로 더블클릭**하면 됩니다. (trace 데이터가 인라인 임베드돼 있어 서버·실행환경 불필요)

- 슬라이더 드래그 / `◀ ▶` 버튼 / 키보드 `←` `→` : 스텝 이동
- `▶ 재생` 또는 `space` : 자동 재생
- 좌: 그래프(노드 색 = 상태), 우: 현재 스텝·큐·거리표

| 노드 색 | 의미 |
|---------|------|
| 회색 | 미발견 |
| 주황 | 큐에서 대기 |
| 파랑 | 현재 방문(확정 중) |
| 초록 | 확정 완료 |

## 파이프라인 (직접 만드는 법)

```
1) 대상 코드에 추적(trace) 계측을 심는다      → trace_bfs.py 의 snap(...) 호출
2) 실행해서 상태 스냅샷 배열을 남긴다          → python3 trace_bfs.py  →  trace.json
3) 시각적 디버거로 재생한다                     → index.html (trace.json 로드 또는 인라인)
```

### 재생성
```bash
cd microworlds/bfs
python3 trace_bfs.py          # trace.json 갱신 (41개 스냅샷)
# index.html 은 외부 trace.json 도 로드하므로, 로컬 서버로 열면 최신 trace 반영:
#   python3 -m http.server  → http://localhost:8000/index.html
```

> 다른 대상(정렬·상태머신·이벤트 루프 등)에 적용하려면 `/micro-world <대상>` 커맨드를 쓰거나,
> `trace_bfs.py`의 `snap()`처럼 계측을 심고 `index.html`의 `render()`/그래프 그리기 부분을
> 대상에 맞게 바꾸면 됩니다.

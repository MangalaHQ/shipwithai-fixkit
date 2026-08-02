# Spec — `fix_source` classification cho multi-repo design-system setups

> **Issue:** [#16](https://github.com/MangalaHQ/shipwithai-fixkit/issues/16) — *triage: missing
> "fix-source repo" classification step in multi-repo design-system setups*
> **Trạng thái:** Revised (đã qua critic review — 3 blocking đóng lại; chờ duyệt PLAN, ADR-0002 HALT)
> **Ngày:** 2026-08-01 · **Phase:** 0 (seam-wiring) · **Loại thay đổi:** trust-anchor (tests-first, mutation-checked)
> **Design overlay:** `docs/DESIGN-DIAGRAMS.md` §10
> **Changelog rev-1:** đóng 3 blocking từ critic — (B1) `both` không được đánh mất nửa consumer;
> (B2) thêm guard nhất quán `fix_source→root_cause_layer` (linkage `upstream⇒escalated` KHÔNG
> tồn tại như guard, chỉ là convention); (B3) `multi_repo` là **input tường minh** ở Phase 0,
> không scan `node_modules` trong core.

---

## 1. Vấn đề

Khi project là **consumer** của một design-system (DS) package có version (setup multi-repo:
site tiêu thụ + repo DS riêng), engine **không có bước phân loại repo nào sở hữu bản fix**.

Hệ quả quan sát được (session `shipwithai.io`, bug #348): `<Aside type="tip">` của Starlight
dùng token `--sl-color-tip-*` hardcoded lệch dark-mode palette của DS. Agent tìm đúng root cause
nhưng **bỏ sót** câu hỏi *"token mapping nên sống ở DS package hay ở `starlight-overrides.css`
của consumer?"* → mặc định đề xuất workaround phía consumer.

### 1.1 Tại sao engine hiện tại chưa chặn được

- `skills/triage` chỉ phân loại **Axis-A** (symptom layer) + subtype + severity.
- `root_cause_layer: upstream` **đã có trong schema** nhưng **KHÔNG có guard** nào nối nó tới
  `escalated`. Trong `lib/ledger-validator.js`, `escalated` chỉ đạt được qua `record_fix_failure`
  (3-strikes) hoặc event `escalate` (không precondition). Câu "upstream → escalated" ở
  `commands/fix.md:28` / `triage/SKILL.md:59` là **convention của orchestrator, không phải guard**.
  → Đây là lần đầu class quy tắc này được enforce bằng code.
- Không có case **`both`** (fix DS trước → publish → bump → rồi consumer). `escalated` là **terminal**
  (`ledger.schema.md:44`), không có transition ra — nên nếu ép `both` vào `escalated` thô, **nửa
  công việc consumer bị đánh mất** (đúng failure mode #16, đảo chiều).
- Không có tín hiệu **multi-repo** và không có **guard machine-checked** ép agent trả lời
  "package hay consumer?" trước khi fix. Quy tắc hiện chỉ nằm ở per-session doc của consumer.

## 2. Mục tiêu / Không mục tiêu

**Mục tiêu (Phase 0):**
- G1. Thêm chiều **`fix_source ∈ {consumer, design-repo, both}`** vào ledger, **enforce bằng
  trust anchor** (`lib/ledger-validator.js`), không phải intent.
- G2. Ép luồng fix **STOP + surface cross-repo path** khi root cause sống trong DS package —
  không sửa consumer sai chỗ, không sửa DS từ session consumer.
- G3. Kích hoạt nhánh **release-sequence** (`both`) như một seam **có tracking** — ledger phải
  ghi nhớ *nửa consumer còn nợ*, không được báo terminal giả.
- G4. Giữ deterministic gate xanh; mỗi guard mới có fixture **cắn** (mutation-checked); single-repo
  không regress.

**Không mục tiêu (Phase 1+):**
- N1. *Thực thi* cross-repo (mở DS repo, `npm publish`, bump dep) — chỉ surface, không tự chạy.
- N2. Fix bug #348 thật trên `shipwithai.io` (1 trong "three live bugs", Phase 1+ per CLAUDE.md).
- N3. Auto-detect `multi_repo` bằng cách scan `node_modules/@{org}/` — việc này thuộc **adapter/pack Phase 1**.
- N4. MCP/connector thật cho registry package.

## 3. Quyết định thiết kế (đã chốt sau review)

**D1 — `fix_source` là Axis-B (sau DIAGNOSE), KHÔNG phải intake.** Issue đề xuất đặt vào `triage`;
spec **cố ý làm khác**: `fix_source` phụ thuộc root cause nên thuộc Axis-B. Đặt vào triage phá ranh
giới `triage/SKILL.md:13` tự tuyên bố. `triage` chỉ nhận **precondition** `multi_repo`.
*Vì sao an toàn dù biết muộn:* DIAGNOSE là **read-only**; harm (sửa nhầm repo) chỉ xảy ra ở **FIX**.
Ngăn chặn chính = **gate trong agent-prompt** (§4.4); guard ledger = **defense-in-depth backstop**
(giống `HARD_LOCK_VIOLATION` là backstop của pre-fix hook).

**D2 — `fix_source` và `root_cause_layer` là hai trục trực giao; KHÔNG gộp (Q2).**
`root_cause_layer ∈ {UI,Logic,System,upstream}` = "*loại* thứ bị hỏng"; `fix_source ∈
{consumer,design-repo,both}` = "*repo nào* sở hữu fix". Một upstream root cause vẫn có thể là
`consumer` (override cục bộ, chấp nhận drift) hoặc `design-repo` hoặc `both`. Gộp sẽ khiến `both`
không biểu diễn được. Quan hệ giữa chúng được diễn đạt bằng **guard nhất quán** (D3), không phải fold.

**D3 — Thêm guard nhất quán riêng (không dựa vào linkage tưởng tượng).**
`fix_source ∈ {design-repo, both} ⇒ root_cause_layer == upstream`, enforce bằng rule-code mới
`FIXSOURCE_ROOTCAUSE_MISMATCH`. (Sửa ngôn ngữ rev-0: đây là *thêm* enforcement nhất quán với
convention `escalated`, KHÔNG phải reuse guard sẵn có.)

**D4 — `multi_repo` là input tường minh ở Phase 0 (Q1).** Core stack-agnostic không scan
`node_modules`. `multi_repo` được set từ tín hiệu tường minh (invocation arg hoặc project-config
field mà invoker truyền vào). Auto-detect qua `package.json` scope là việc của **Phase-1 pack/adapter**.

**D5 — `both` giữ nửa consumer sống bằng field `pending_followup` (Q3).** Không dùng plain
`escalated` (mất nửa consumer), không tạo state mới (phá goal "no new state machine"). Khi
`fix_source == both`: nửa DS `escalated` + `pending_followup: consumer`; cross-repo handoff mang
sequence. Phase 0 chỉ **surface**, nhưng ledger **không** báo terminal sạch.

## 4. Thay đổi theo component

### 4.1 `lib/ledger.schema.md` — 3 field mới

| Field | Type | Notes |
|---|---|---|
| `multi_repo` | bool | **input tường minh** (D4); default `false`. Không auto-detect trong core. |
| `fix_source` | enum | `consumer` \| `design-repo` \| `both`; rỗng cho tới DIAGNOSE. Bắt buộc non-empty ở mọi **`POST_ROOTCAUSE_STATES`** (`ledger-validator.js:17`) **khi** `multi_repo == true`. |
| `pending_followup` | enum | `none` \| `consumer`; default `none`. Set `consumer` khi `fix_source == both` (D5) — nửa consumer còn nợ sau khi DS được publish. |

Ràng buộc (guard hoá ở §4.2): `fix_source ∈ {design-repo, both} ⇒ root_cause_layer == upstream`.

### 4.2 `lib/ledger-validator.js` (trust anchor) — 3 rule-code mới

| Rule code | Guard | Semantics |
|---|---|---|
| `FIX_SOURCE_UNSET_MULTIREPO` | pre-fix | `multi_repo == true` mà ở bất kỳ `POST_ROOTCAUSE_STATE` với `fix_source` rỗng → REFUSE |
| `CROSS_REPO_CONSUMER_EDIT` | pre-fix | `fix_source ∈ {design-repo, both}` mà cố vào `fixed`/`candidate` (post-fix trong consumer) → REFUSE; buộc `escalated` |
| `FIXSOURCE_ROOTCAUSE_MISMATCH` | invariant | `fix_source ∈ {design-repo, both}` nhưng `root_cause_layer != upstream` → REJECT (chặn ledger `design-repo` gắn root_cause_layer: Logic vượt guard) |

- Áp cả hai surface: `validateLedger(snapshot)` + `applyTransition(ledger, event)` — giống guard hiện hữu.
- Scope thống nhất = `POST_ROOTCAUSE_STATES` (không phải riêng `fixed`/`candidate`) để mirror Iron Law.
- **Không nới** guard nào đang có; guard mới là **defense-in-depth**, không thay thế agent-prompt gate.

### 4.3 `commands/fix.md` — gate ở bước 6→7

Sau khi viết `root_cause` (DIAGNOSE), nếu `multi_repo` thì **bắt buộc** set `fix_source`, rồi route:
- `consumer` → fix bình thường trong repo hiện tại (luồng cũ).
- `design-repo` → **STOP**, emit *cross-repo handoff* (fix DS → publish → bump), `state: escalated`,
  **không đụng consumer code**.
- `both` → như `design-repo` + `pending_followup: consumer` + surface **release-sequence** (DS-first,
  consumer follow-up).

Cập nhật section `## What this command does NOT do` (thêm hành vi STOP cross-repo).

### 4.4 `agents/{ui,logic,system}-bug-agent.md` — thêm 1 gate (ngăn chặn CHÍNH)

Trước khi propose fix (sau DIAGNOSE): trả lời *"root cause nằm trong package hay repo mình?"* →
set `fix_source`. Đây là **primary prevention** (guard ledger chỉ là backstop). Cập nhật
`## What this agent does NOT do` (không sửa consumer khi `fix_source ∈ {design-repo, both}`).

### 4.5 `skills/triage/SKILL.md` — chỉ nhận precondition tường minh

Nhận `multi_repo` từ input tường minh (D4) và ghi vào ledger; **không scan `node_modules`**.
Ghi rõ triage **không** quyết `fix_source` (việc của DIAGNOSE/Axis-B). Cập nhật evals
(giữ ≥5; ≥3 trigger / ≥2 must-not). Triage đang 66/200 dòng → còn headroom.

### 4.6 Cross-repo handoff — artifact riêng (KHÔNG reuse `handoff/v0`)

`handoff/v0` (`lib/handoff.schema.md`) là *verification* handoff (env/url/steps/assertion) —
**không khớp** cross-repo remediation. Cần **artifact riêng** (`cross-repo-handoff/v0`) với field:
`{ target_repo, root_cause_ref, remediation: "fix DS → publish <bump> → bump consumer dep",
sequence, pending_followup }`, kèm validator riêng (hoặc mở rộng schema). Phase 0 chỉ **emit + surface**.

## 5. Test plan (tests-first — BLOCKING)

Viết fixtures/tests **trước** khi sửa validator; mỗi guard phải **cắn** (mutation-checked).

| Fixture / test | Kỳ vọng |
|---|---|
| `neg-fixsource.unset-multirepo.md` | `multi_repo: true`, `fix_source` rỗng, POST_ROOTCAUSE state → REJECT `FIX_SOURCE_UNSET_MULTIREPO` |
| `neg-crossrepo.consumer-edit.md` | `fix_source: design-repo`, state `fixed` → REJECT `CROSS_REPO_CONSUMER_EDIT` |
| `neg-fixsource.rootcause-mismatch.md` | `fix_source: design-repo`, `root_cause_layer: Logic` → REJECT `FIXSOURCE_ROOTCAUSE_MISMATCH` |
| `crossrepo.escalated.md` (happy design-repo) | `fix_source: design-repo`, `root_cause_layer: upstream`, `escalated` + cross-repo handoff hợp lệ → ACCEPT |
| `crossrepo.both-followup.md` (happy both) | `fix_source: both`, `escalated`, `pending_followup: consumer` → ACCEPT; ledger KHÔNG báo terminal sạch |
| Negative control | `multi_repo: false` (single-repo) → guard **không** kích hoạt (không regress) |
| Mutation check | Đảo từng guard → fixture negative tương ứng chuyển REJECT→ACCEPT (chứng minh load-bearing) |

Gate: `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` exit 0. Cập nhật convention +
eval-schema linter nếu số check đổi. Giữ mọi quality limit.

## 6. Ranh giới Phase & tương thích ngược

- **Phase 0 (spec này):** 3 field + 3 guard/rule-code + gate STOP/surface + cross-repo handoff
  artifact + tests. Thuần seam-wiring, đồng dạng `hard_lock_violations`.
- **Phase 1+:** thực thi release-sequence, auto-detect `multi_repo`, connector registry, fix bug thật.
- **Backward-compat:** `multi_repo`/`pending_followup` default → ledger single-repo cũ **không** đổi
  hành vi; guard mới chỉ kích hoạt khi `multi_repo == true`. Field mới optional.

## 7. Acceptance criteria

- [ ] AC1. `multi_repo: true` + `fix_source` rỗng không thể vào POST_ROOTCAUSE state (`FIX_SOURCE_UNSET_MULTIREPO`).
- [ ] AC2. `fix_source ∈ {design-repo, both}` không thể `fixed`/`closed` trong consumer; buộc `escalated` (`CROSS_REPO_CONSUMER_EDIT`).
- [ ] AC3. `fix_source ∈ {design-repo, both}` với `root_cause_layer != upstream` → REJECT (`FIXSOURCE_ROOTCAUSE_MISMATCH`).
- [ ] AC4. `both` giữ `pending_followup: consumer`; ledger không báo terminal sạch; cross-repo handoff hợp lệ.
- [ ] AC5. Nhánh `design-repo`/`both` emit cross-repo handoff + surface sequence; **không** ghi vào consumer source.
- [ ] AC6. Single-repo (`multi_repo: false`) không regress: gate xanh, guard cũ nguyên vẹn.
- [ ] AC7. Mọi guard mới có fixture cắn + mutation-checked; `tests/run-all.js` exit 0.
- [ ] AC8. Skill/agent sửa đổi giữ section `## What this … does NOT do` + quality limits; rule-code mới thêm vào vocab ở `core/CLAUDE.md` + `commands/fix.md`.
- [ ] AC9. `docs/DESIGN-DIAGRAMS.md` §10 phản ánh thiết kế cuối (gồm `pending_followup` + rule-code thứ 3).

## 8. Rủi ro còn lại

- **R1 — Guard là backstop, không phải chặn edit trực tiếp:** harm thật ở FIX, ngăn chính bằng
  agent-prompt gate (§4.4); ledger guard là defense-in-depth. Đã nêu tường minh (D1).
- **R2 — `multi_repo` input tường minh** phụ thuộc invoker/pack cung cấp; nếu không truyền, feature
  im lặng không kích hoạt (an toàn: fail-closed về single-repo, không regress).
- **R3 — Cross-repo handoff schema mới** cần validator riêng → thêm phạm vi nhỏ so với rev-0.

## 9. Phạm vi thay đổi (file tree)

```
plugins/shipwithai-fixkit-core/
  lib/ledger.schema.md            (M) + multi_repo, fix_source, pending_followup
  lib/ledger-validator.js         (M) + 3 guard/rule-code            ← tests-first
  lib/cross-repo-handoff.schema.md(A) artifact + validator riêng (hoặc mở rộng handoff)
  commands/fix.md                 (M) gate 6→7 + "does NOT do" + vocab rule-code
  agents/ui-bug-agent.md          (M) + gate fix_source (primary prevention)
  agents/logic-bug-agent.md       (M) + gate fix_source
  agents/system-bug-agent.md      (M) + gate fix_source
  skills/triage/SKILL.md          (M) + precondition multi_repo (input) (+ evals)
  evals/fixtures/ledger/
    neg-fixsource.unset-multirepo.md   (A)
    neg-crossrepo.consumer-edit.md     (A)
    neg-fixsource.rootcause-mismatch.md(A)
    crossrepo.escalated.md             (A)
    crossrepo.both-followup.md         (A)
  tests/run-all.js                (M) + acceptance cho 3 guard mới
  CLAUDE.md                       (M) + 3 rule-code vào "Rule codes" vocab
docs/DESIGN-DIAGRAMS.md           (M) §10 cập nhật (pending_followup + rc thứ 3)
```
(M = modify · A = add · KHÔNG có D = delete — solution thuần cộng seam.)

## 10. Điều spec này KHÔNG làm

- Không thực thi cross-repo (publish/bump) — chỉ surface (Phase 1+).
- Không auto-detect `multi_repo` bằng scan `node_modules` trong core (Phase 1 adapter/pack).
- Không fix bug #348 thật, không bind connector registry.
- Không nới/gỡ guard hiện có; không tạo state machine mới (tái dùng `escalated` + field `pending_followup`).
- Không gộp `fix_source` vào `root_cause_layer`; không quyết `fix_source` tại intake (giữ Axis-B).
- Không giả định linkage `upstream⇒escalated` là guard sẵn có — nó là convention; guard mới là lần đầu enforce.

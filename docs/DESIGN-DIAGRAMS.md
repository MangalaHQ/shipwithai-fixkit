# shipwithai-fixkit — Design Diagrams (HLD + Solution Design)

> Biểu đồ Mermaid mô tả hệ thống **hiện có**. Quy ước màu/ghi chú:
> phần **Phase 0 (đã ship)** là nét liền; phần **Phase 1+ (mới là seam, chưa build)**
> được đánh dấu `(seam)` / nét đứt. Nguồn: nghiên cứu repo 2026-07.

---

## 1. HLD — System Context (ai tương tác với cái gì)

```mermaid
flowchart TB
    dev(["Developer"])

    subgraph cc["Claude Code (host)"]
        harness["Harness .claude/<br/>hooks · settings · memory · drift-monitor"]
        plugins["fixkit plugins<br/>(core + adapters)"]
    end

    subgraph repo["Consumer project repo (app của bạn)"]
        src["Source code + tests"]
        ledger[".fixkit/ ledger<br/>(committed audit trail)"]
        playbook["docs/playbook/<br/>(mined patterns)"]
        proj["CLAUDE.md / AGENTS.md<br/>(domain context)"]
    end

    subgraph tools["Real tools (qua ~~connectors)"]
        browser["~~browser<br/>Playwright / Chrome"]
        runner["~~test-runner<br/>npm test / vitest / pytest"]
        ci["~~ci<br/>GitHub Actions"]
        mon["~~monitoring<br/>boundary logs / Sentry"]
    end

    dev -->|"/fix &lt;symptom, URL, expected&gt;"| plugins
    plugins -->|đọc/sửa| src
    plugins -->|ghi trạng thái bug| ledger
    plugins -->|đề xuất| playbook
    plugins -->|đọc domain| proj
    harness -.->|bảo vệ + observe| plugins

    plugins -->|quan sát UI| browser
    plugins -->|chạy proof| runner
    plugins -->|pipeline proof| ci
    plugins -->|boundary proof| mon
```

---

## 2. HLD — Kiến trúc phân tầng (3 tiers + cross-cutting)

```mermaid
flowchart TB
    subgraph L3["Tier 3 — Domain / Org  (seam, Phase 1+)"]
        pack["shipwithai-fixkit-focus (pack)<br/>hard-locks · boost vocabulary · org bugs<br/>PRIVATE — chưa có trong repo public"]
    end

    subgraph L2["Tier 2 — Adapters (stack-specific, thin)"]
        web["web (0.3.0)<br/>UI=FULL"]
        be["backend (0.1.0)<br/>UI=NONE"]
        android["android (0.1.0)<br/>UI=ASSIST"]
        ios["ios (0.1.0)<br/>UI=ASSIST"]
        kmp["kmp (0.1.0)<br/>UI=ASSIST"]
    end

    subgraph L1["Tier 1 — Core (process-generic, engine)"]
        orch["Orchestrator (fix.md)"]
        skills["Skills: triage · spine · verification<br/>regression-guard · pattern-mining"]
        agents["Layer-agents: ui · logic · system<br/>+ pattern-learning"]
        anchor["Trust anchor: ledger-validator.js<br/>(state machine + guards)"]
        gate["Deterministic gate: tests/run-all.js (99 checks)"]
    end

    L3 -. "hard_lock_violations seam" .-> L1
    L2 -->|"maps ~~category → tool"| L1
    orch --> skills --> agents --> anchor
    anchor --- gate
```

**Nguyên tắc:** compose **by convention** (slash-path + sub-skill `user-invocable:false`
+ `agents/*.md`), **không** wiring qua `plugin.json` dependency. Adapter *phụ thuộc* core
(gọi xuống), không *chứa* core.

---

## 3. HLD — Bên trong Core (composition)

```mermaid
flowchart LR
    cmd["/shipwithai-fixkit-core:fix<br/>(commands/fix.md)"]

    subgraph sk["skills/"]
        triage["triage<br/>(user-invocable)"]
        spine["spine<br/>(vendored)"]
        verif["verification"]
        guard["regression-guard"]
        mine["pattern-mining"]
    end

    subgraph ag["agents/ (model: sonnet)"]
        ui["ui-bug-agent"]
        logic["logic-bug-agent"]
        sys["system-bug-agent"]
        learn["pattern-learning<br/>(read-only)"]
    end

    subgraph lib["lib/ (zero-dep Node)"]
        val["ledger-validator.js"]
        schema["ledger.schema.md"]
        ho["handoff-validator.js"]
        miner["pattern-miner.js"]
        fm["frontmatter.js"]
    end

    cmd --> triage
    cmd --> ui & logic & sys
    ui & logic & sys --> spine
    spine --> verif --> guard
    ui & logic & sys -->|"applyTransition / validateLedger"| val
    verif -->|"ASSIST → handoff/v0"| ho
    learn --> miner
    val --- schema
```

---

## 4. Solution — Vòng lặp Fix (10 bước + guards)

```mermaid
flowchart TD
    start(["/fix &lt;bug&gt;"]) --> intake["1. INTAKE<br/>mở ledger · state: open"]
    intake --> classify["2. CLASSIFY (Axis A)<br/>skill triage → symptom_layer"]
    classify --> select["3. SELECT ADAPTER<br/>đọc capability + CONNECTORS"]
    select --> spawn["4. SPAWN layer-agent<br/>ui / logic / system"]
    spawn --> repro["5. REPRODUCE<br/>state: reproduced"]

    repro --> diag["6. DIAGNOSE<br/>viết root_cause + root_cause_layer<br/>state: diagnosed"]
    diag --> ironlaw{"root_cause<br/>có không?"}
    ironlaw -->|"rỗng"| block1["❌ IRON_LAW_FIX_BEFORE_ROOT_CAUSE<br/>không cho FIX"]
    block1 --> diag
    ironlaw -->|"có"| axisb{"root_cause_layer<br/>== symptom_layer?"}
    axisb -->|"khác (Axis B)"| redispatch["re-dispatch sang<br/>layer-agent đúng"]
    redispatch --> diag
    axisb -->|"upstream design organism"| esc["state: escalated<br/>(gap-log, không sửa consumer)"]
    axisb -->|"khớp"| hardlock{"hard_lock_violations<br/>rỗng? (seam)"}

    hardlock -->|"không"| block2["❌ HARD_LOCK_VIOLATION"]
    hardlock -->|"rỗng"| fix["7. FIX<br/>smallest change"]
    fix --> strikes{"fail lần thứ?"}
    strikes -->|">= 3"| esc
    strikes -->|"< 3"| verify["8. VERIFY (skill verification)"]

    verify --> tier{"capability_tier?"}
    tier -->|"FULL: chạy + observe"| verified["ghi evidence + verified_by<br/>state: verified"]
    tier -->|"ASSIST: không observe"| candidate["emit handoff/v0<br/>state: candidate (DỪNG)"]

    verified --> guardstep["9. GUARD<br/>để lại artifact khớp root cause"]
    guardstep --> close["10. CLOSE<br/>integrity rule check"]
    close --> closed(["state: closed ✅"])

    candidate --> handoff(["chờ verifier ngoài<br/>(Cowork/human/CI)"])
    esc --> stopped(["escalated 🛑"])
```

---

## 5. Solution — Ledger State Machine (trust anchor)

```mermaid
stateDiagram-v2
    [*] --> open: intake + triage
    open --> reproduced: enter_reproduced
    reproduced --> diagnosed: enter_diagnosed (viết root_cause)
    diagnosed --> gated: enter_gated (Phase 0 = none)

    diagnosed --> fixed: enter_fixed (Iron Law + hard-lock)
    gated --> fixed: enter_fixed
    diagnosed --> candidate: enter_candidate (ASSIST only)
    gated --> candidate: enter_candidate

    fixed --> verified: enter_verified (fix recorded)
    candidate --> verified: verifier ngoài
    verified --> closed: close (integrity + layer-proof)

    diagnosed --> escalated: 3-strikes / upstream
    fixed --> escalated: 3-strikes
    reproduced --> escalated: escalate

    closed --> [*]
    escalated --> [*]

    note right of candidate
        ASSIST ceiling: không bao giờ tới closed
        (ASSIST_CANNOT_CLOSE)
    end note
    note right of closed
        Guard tại close:
        INTEGRITY_EVIDENCE_EMPTY / VERIFIER_MISSING
        FIX_NOT_RECORDED
        VERIFICATION_LAYER_MISMATCH
    end note
```

---

## 6. Solution — Quyết định Capability Tier (proof theo lớp)

```mermaid
flowchart TD
    b(["Bug ở layer L<br/>(UI / Logic / System)"]) --> conn{"Connector cần<br/>cho proof của L<br/>có mặt?"}

    conn -->|"UI: ~~browser<br/>Logic: ~~test-runner<br/>System: ~~ci + shell + ~~monitoring"| full["FULL<br/>chạy + observe artifact"]
    conn -->|"build/diagnose được<br/>nhưng không observe"| assist["ASSIST<br/>emit handoff/v0"]
    conn -->|"không build được ở đây<br/>(vd backend + UI)"| none["NONE<br/>từ chối tại triage<br/>→ re-route adapter khác"]

    full --> proofmatch{"method ∈ LAYER_METHODS[L]?"}
    proofmatch -->|"UI: computed-style/dom/...<br/>Logic: test-run/...<br/>System: instrumented-boundary/..."| closeok["→ có thể state: closed ✅"]
    proofmatch -->|"vd UI đóng trên source diff"| mismatch["❌ VERIFICATION_LAYER_MISMATCH"]

    assist --> stop["→ dừng ở candidate<br/>(không auto-close)"]
    none --> reroute["→ triage chọn adapter khác"]
```

---

## 7. Solution — Sequence: một bug UI trên web (concrete, FULL)

```mermaid
sequenceDiagram
    actor Dev
    participant Orch as fix.md (orchestrator)
    participant Triage as skill triage
    participant UIAgent as ui-bug-agent
    participant Drive as drive.js (browser)
    participant Val as ledger-validator.js
    participant Ledger as .fixkit ledger

    Dev->>Orch: /fix "code block overflow, /blog/x, kỳ vọng không tràn ngang"
    Orch->>Ledger: tạo entry (state: open)
    Orch->>Triage: phân loại
    Triage-->>Orch: symptom_layer=UI, subtype=layout
    Orch->>UIAgent: dispatch (kèm ledger path)

    UIAgent->>Drive: measure overflow @1280
    Drive-->>UIAgent: ok:false (scrollWidth 2443 / clientWidth 1280)
    UIAgent->>Ledger: state: reproduced

    UIAgent->>UIAgent: DIAGNOSE → root_cause = "pre thiếu overflow-x"
    UIAgent->>Val: applyTransition(enter_fixed)
    Val-->>UIAgent: ok (Iron Law pass, hard-lock rỗng)
    UIAgent->>Ledger: state: fixed (fix: overflow-x:auto)

    UIAgent->>Drive: re-measure overflow @1280
    Drive-->>UIAgent: ok:true (1280/1280)
    UIAgent->>Ledger: verification{method:dom-assertion, tier:FULL,<br/>evidence:"1280/1280", verified_by:"ui-bug-agent (web/playwright)"}
    UIAgent->>Val: applyTransition(close)
    Val-->>UIAgent: ok (evidence+verifier+layer-proof đủ)
    UIAgent->>Ledger: state: closed ✅
    Orch-->>Dev: BUG-x closed on live measurement
```

---

## 8. Solution — CI/CD & Versioning (infra hiện có)

```mermaid
flowchart LR
    subgraph pr["Pull Request (paths: plugins/**)"]
        v["validate-plugin.yml<br/>• file bắt buộc<br/>• 4-key version sync<br/>• node tests/run-all.js"]
        hs["harness-smoke.yml<br/>(web-only)<br/>Playwright out-of-tree /tmp/pw"]
    end

    subgraph main["push → main"]
        detect{"plugin.json<br/>version bump?"}
        pub["publish-plugin.yml<br/>tạo GitHub Release<br/>tag &lt;plugin&gt;/v&lt;ver&gt;"]
    end

    pr -->|merge| main
    detect -->|có| pub
    detect -->|không| noop["(no-op)"]

    subgraph sync["4-key version sync (BLOCKING)"]
        k1["plugin.json"]
        k2["per-plugin marketplace.json<br/>(top-level)"]
        k3["per-plugin marketplace.json<br/>plugins[0]"]
        k4["root marketplace.json entry"]
    end
    k1 --- k2 --- k3 --- k4
    v -. kiểm .-> sync
```

---

## 9. Component tổng hợp — fixkit vs external (color-coded)

> Một đồ thị duy nhất gom **tất cả** components (commands · skills · agents · lib · adapters ·
> harness · CI · gate) và các hệ thống bên ngoài. Quy ước màu:
> **đen** = thành phần của fixkit · **vàng** = thành phần của hệ thống bên ngoài.

```mermaid
flowchart TB
    %% ===================== EXTERNAL (vàng) =====================
    dev(["👤 Developer"])

    subgraph host["Claude Code host + runtimes (external)"]
        cc["Claude Code<br/>(plugin host / agent runtime)"]
        node["Node.js<br/>(chạy validator + gate)"]
        py["Python 3 stdlib<br/>(chạy safety hooks)"]
    end

    subgraph realtools["Real tools — qua ~~connectors (external)"]
        pw["Playwright / Chromium"]
        runner["vitest / npm test / pytest"]
        gha["GitHub Actions"]
        sentry["Sentry / boundary logs"]
        git["git"]
    end

    subgraph gh["GitHub (external)"]
        mcp["MCP server: github<br/>api.githubcopilot.com"]
        rel["Releases + Package Registry"]
    end

    subgraph consumer["Consumer project repo (external)"]
        src["source code + tests"]
        fixdir[".fixkit/ ledger<br/>(audit trail)"]
        projctx["CLAUDE.md / AGENTS.md"]
        dspkg["node_modules/@mangalahq/<br/>shipwithai-sot-design<br/>(DS package · bug #16)"]
    end

    upstream["superpowers:systematic-debugging<br/>(MIT © Jesse Vincent — nguồn spine vendored)"]

    %% ===================== FIXKIT (đen) =====================
    subgraph root["fixkit repo root"]
        mkt["marketplace.json (root)<br/>+ per-plugin manifests"]
        gate["tests/run-all.js<br/>DETERMINISTIC GATE (99 checks)"]
    end

    subgraph harness["Harness .claude/ (fixkit)"]
        hcmd["hooks: validate-command.py<br/>protect-files.py · observe.py"]
        drift["drift-monitor agent"]
        settings["settings.json / memory"]
    end

    subgraph ci["CI .github/workflows (fixkit)"]
        wval["validate-plugin.yml<br/>(4-key version sync)"]
        wpub["publish-plugin.yml"]
        wsmoke["harness-smoke.yml"]
    end

    subgraph core["Plugin: shipwithai-fixkit-core — ENGINE (fixkit)"]
        cmd["commands/fix.md<br/>ORCHESTRATOR (main thread)"]

        subgraph sk["skills/"]
            triage["triage (user-invocable)"]
            spine["spine (vendored)"]
            verif["verification"]
            rguard["regression-guard"]
            mine["pattern-mining"]
        end

        subgraph ag["agents/ (model: sonnet)"]
            uia["ui-bug-agent"]
            la["logic-bug-agent"]
            sa["system-bug-agent"]
            pl["pattern-learning (read-only)"]
        end

        subgraph lib["lib/ (zero-dep Node — trust anchor)"]
            val["ledger-validator.js<br/>validateLedger + applyTransition"]
            fm["frontmatter.js"]
            hov["handoff-validator.js"]
            pm["pattern-miner.js"]
            lschema["ledger.schema.md"]
            hschema["handoff.schema.md"]
        end

        conn["CONNECTORS.md<br/>~~runtime ~~test-runner ~~ci<br/>~~browser ~~source-control ~~monitoring"]
        fixtures["evals/fixtures/<br/>stub-adapter + ledger fixtures"]
    end

    subgraph adapters["Adapter plugins — thin (fixkit)"]
        web["web (0.3.0) UI=FULL<br/>skills env/reproduce/verify/source-map<br/>+ lib: drive.js · measures.js · capability.json"]
        be["backend (0.1.0) UI=NONE"]
        andr["android (0.1.0) UI=ASSIST"]
        ios["ios (0.1.0) UI=ASSIST"]
        kmp["kmp (0.1.0) UI=ASSIST"]
    end

    %% ===================== EDGES =====================
    dev -->|"/shipwithai-fixkit-core:fix"| cc
    cc --> cmd
    cmd --> triage
    cmd -->|spawn| uia & la & sa
    uia & la & sa --> spine
    spine --> verif --> rguard
    pl --> mine --> pm
    uia & la & sa -->|"applyTransition / validateLedger"| val
    verif -->|"ASSIST → handoff/v0"| hov
    val --- lschema
    hov --- hschema
    fm -.-> val
    spine -. "vendored from" .- upstream

    cmd -->|"select adapter + capability"| adapters
    adapters -->|"map ~~category → tool"| conn
    web -->|"~~browser"| pw
    web & be & andr & ios & kmp -->|"~~test-runner"| runner
    be -->|"~~monitoring"| sentry
    adapters -->|"~~ci"| gha
    adapters -->|"~~source-control"| git

    val -->|"reads/writes state"| fixdir
    uia & la & sa -->|"read/edit"| src
    cmd -->|"read domain"| projctx
    triage -.->|"bug #16: cần dò"| dspkg

    val & gate -->|"executes on"| node
    hcmd -->|"executes on"| py
    harness -.->|"protect + observe"| core
    gate --- fixtures

    wval -->|"runs"| gate
    wval & wpub & wsmoke --> gha
    wpub --> rel
    cc -.->|"code/issue ops"| mcp

    %% ===================== STYLES =====================
    classDef fixkit fill:#111111,stroke:#000000,color:#ffffff;
    classDef external fill:#ffd43b,stroke:#e8940c,color:#111111;

    class mkt,gate,hcmd,drift,settings,wval,wpub,wsmoke,cmd,triage,spine,verif,rguard,mine,uia,la,sa,pl,val,fm,hov,pm,lschema,hschema,conn,fixtures,web,be,andr,ios,kmp fixkit;
    class dev,cc,node,py,pw,runner,gha,sentry,git,mcp,rel,src,fixdir,projctx,dspkg,upstream external;
```

**Cách đọc:** đen = thứ fixkit sở hữu (engine core + 5 adapter + harness + CI + gate);
vàng = hệ thống bên ngoài fixkit gọi tới nhưng không sở hữu (Claude Code host, Node/Python
runtime, real tools sau `~~connectors`, GitHub, consumer repo, DS package, upstream spine).
Gap của **bug #16** = mũi tên nét đứt `triage ⟶ dspkg`: `triage` chưa có bước bắt buộc dò
root cause thuộc **DS package** hay **consumer source** (thiếu "fix-source dimension").

---

## 10. Solution overlay — fix cho bug #16 (`fix_source` classification)

> Overlay giải pháp lên slice engine bị ảnh hưởng. Quy ước màu:
> **xanh lá** = component / field / rule-code **thêm mới** (nét xanh lá = điểm nối mới) ·
> **xanh dương** = component **sửa đổi** · **đỏ** = **xoá** (solution này: KHÔNG có) ·
> nền **đen** = fixkit không đổi · **vàng** = external.

```mermaid
flowchart TB
    subgraph legend["Chú giải màu"]
        la["thêm mới"]
        lm["sửa đổi"]
        ld["xoá (none)"]
        lc["fixkit không đổi"]
        le["external"]
    end

    subgraph engine["core engine (fixkit)"]
        triage["skills/triage/SKILL.md"]
        cmd["commands/fix.md<br/>(orchestrator)"]
        agents["agents/{ui,logic,system}-bug-agent.md"]
        val["lib/ledger-validator.js<br/>(trust anchor)"]
        lschema["lib/ledger.schema.md"]
        gate["tests/run-all.js (gate)"]
        esc["state: escalated<br/>(TÁI DÙNG — không đổi)"]
    end

    subgraph newc["MỚI (solution)"]
        mrflag["field: multi_repo<br/>(input tường minh)"]
        fsfield["field: fix_source<br/>consumer | design-repo | both"]
        pfield["field: pending_followup<br/>none | consumer"]
        rc1["rule-code:<br/>FIX_SOURCE_UNSET_MULTIREPO"]
        rc2["rule-code:<br/>CROSS_REPO_CONSUMER_EDIT"]
        rc3["rule-code:<br/>FIXSOURCE_ROOTCAUSE_MISMATCH"]
        xhandoff["cross-repo-handoff/v0<br/>DS-fix → publish → bump dep"]
        fx1["fixture:<br/>neg-fixsource.unset-multirepo.md"]
        fx2["fixture:<br/>neg-crossrepo.consumer-edit.md"]
        fx3["fixture:<br/>neg-fixsource.rootcause-mismatch.md"]
        fx4["fixture:<br/>crossrepo.escalated (happy)"]
        fx5["fixture:<br/>crossrepo.both-followup (happy)"]
    end

    subgraph ext["external"]
        src["consumer source + tests"]
        fixdir[".fixkit/ ledger"]
        dspkg["@mangalahq/shipwithai-sot-design<br/>(DS package)"]
        reg["GitHub Releases + Package Registry"]
    end

    %% ---- existing edges (giữ nguyên) ----
    cmd --> triage
    cmd -->|"spawn"| agents
    agents -->|"applyTransition"| val
    val --- lschema
    gate --- val
    val -->|"reads/writes"| fixdir
    agents -->|"read/edit"| src

    %% ---- NEW edges (xanh lá) ----
    triage -->|"multi_repo (input)"| mrflag
    agents -->|"DIAGNOSE sets"| fsfield
    mrflag -.- lschema
    fsfield -.- lschema
    pfield -.- lschema
    val -->|"new guard"| rc1
    val -->|"new guard"| rc2
    val -->|"new invariant"| rc3
    rc1 -->|"require ở POST_ROOTCAUSE"| fsfield
    rc2 -->|"design-repo/both ⇒ block consumer"| esc
    rc3 -->|"phải là upstream"| fsfield
    cmd -->|"route theo fix_source"| xhandoff
    xhandoff -->|"escalated + surface"| esc
    xhandoff -->|"both ⇒ pending_followup"| pfield
    xhandoff -.->|"path: publish → bump"| reg
    xhandoff -.->|"root cause sống ở"| dspkg
    gate --> fx1
    gate --> fx2
    gate --> fx3
    gate --> fx4
    gate --> fx5

    %% ---- styles ----
    classDef added    fill:#2f9e44,stroke:#1b5e2a,color:#ffffff;
    classDef modified fill:#1971c2,stroke:#0b3d66,color:#ffffff;
    classDef deleted  fill:#e03131,stroke:#7a1212,color:#ffffff;
    classDef fixkit   fill:#111111,stroke:#000000,color:#ffffff;
    classDef external fill:#ffd43b,stroke:#e8940c,color:#111111;

    class mrflag,fsfield,pfield,rc1,rc2,rc3,xhandoff,fx1,fx2,fx3,fx4,fx5,la added;
    class triage,cmd,agents,val,lschema,gate,lm modified;
    class ld deleted;
    class esc,lc fixkit;
    class src,fixdir,dspkg,reg,le external;

    %% NEW edges = index 7..27 → tô xanh lá
    linkStyle 7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27 stroke:#2f9e44,stroke-width:2px;
```

**Đọc overlay** (đã đồng bộ với spec rev-1 sau critic review):
- **Xanh dương (sửa):** `triage` (nhận `multi_repo` **input tường minh**, không scan node_modules) ·
  `fix.md` (route theo `fix_source`) · `*-bug-agent` (gate "package hay consumer?" — ngăn chặn chính) ·
  `ledger.schema.md` (3 field) · `ledger-validator.js` (3 guard) · `tests/run-all.js` (checks).
- **Xanh lá (mới):** 3 field (`multi_repo`, `fix_source`, `pending_followup`) · 3 rule-code
  (`FIX_SOURCE_UNSET_MULTIREPO`, `CROSS_REPO_CONSUMER_EDIT`, `FIXSOURCE_ROOTCAUSE_MISMATCH`) ·
  artifact `cross-repo-handoff/v0` · 5 fixture. Các **nét xanh lá** = luồng mới: `triage→multi_repo`,
  `DIAGNOSE→fix_source`, 3 guard trong validator, nhánh `design-repo/both → escalated + surface`,
  và `both → pending_followup` (giữ nửa consumer còn nợ — không báo terminal giả).
- **Đen (tái dùng):** `escalated` — solution cắm vào state sẵn có, không tạo state mới.
- **Đỏ (xoá):** không có — solution thuần cộng thêm seam, không gỡ gì.

**Ranh giới Phase trên overlay:** toàn bộ node xanh/xanh dương thuộc **Phase-0 seam-wiring**. Việc
*thực thi* cross-repo handoff (mở DS repo → publish → bump) và fix bug #348 thật là **Phase 1+**;
ở Phase 0 nhánh này chỉ dừng ở `escalated` (+ `pending_followup` cho `both`) + surface đường đi
(đúng Integrity Rule — không giả vờ đã fix). Guard ledger là **defense-in-depth**; ngăn chặn chính
là gate trong agent-prompt (harm thật ở FIX, không phải DIAGNOSE vốn read-only).

---

## Ghi chú đọc biểu đồ

- **Trust anchor = `ledger-validator.js`**: mọi mũi tên "guard/❌" đều do file này thực thi
  (deterministic). Nó kiểm *hình thức* (field/enum), **không** kiểm *tính đúng domain* — chân lý
  domain đến từ mô tả bug + test/spec của project + pack (Tier 3).
- **Phase 0 = Tier 1 + Tier 2** (core + adapters). **Tier 3 (pack/domain)** và các connector thật
  đầy đủ là **Phase 1+**, cắm vào qua `hard_lock_violations` seam.
- **ASSIST ≠ thất bại**: là chế độ trung thực khi thiếu runner — dừng ở `candidate` + `handoff/v0`
  thay vì `closed` giả.

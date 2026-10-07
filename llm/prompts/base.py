"""
모든 캐릭터 프롬프트가 공통으로 사용하는 유틸 함수 모음 파일.

주요 역할
- 수치 딕셔너리 → 자연어 설명 변환 (stats_to_description)
- 수치 범위 → 말투 지침 생성 (stats_to_tone_guidance)
- 루프 회차 → 정보 공개 제한 지침 생성 (_LOOP_RESTRICTION)
- 캐릭터 SystemMessage 조립 (build_system_prompt)
- 대화 기록 → LangChain 메시지 리스트 변환 (build_message_history)

새로운 수치 항목이 추가될 경우 stats_to_tone_guidance()에
해당 항목의 분기 로직만 추가하면 된다.

루프별 공개 범위를 수정하려면 _LOOP_RESTRICTION 딕셔너리만 수정하면 된다.
캐릭터 파일(cha_seoyeon.py 등)은 수정 불필요.
"""

import re

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from config import THRESHOLDS


# ────────────────────────────────────────────
# 플레이어 이름 유틸
# ────────────────────────────────────────────

# 두 글자 성 (네 글자 이름일 때만 확인)
_COMPOUND_SURNAMES = ("남궁", "제갈", "선우", "황보", "독고", "사공", "서문", "동방", "어금", "망절")


def get_first_name(full_name: str) -> str:
    """
    한글 닉네임에서 성을 제거하고 이름만 반환한다. (닉네임은 오프닝에서 한글만 받음)

    - 세 글자            → 첫 글자를 성으로 보고 제거  ("정재희" → "재희")
    - 네 글자 + 두 글자 성 → 두 글자 제거             ("남궁민수" → "민수")
    - 그 외(두 글자 이하 등) → 그대로                  ("하하" → "하하", "이준" → "이준")
      두 글자는 닉네임일 수 있어서 자르지 않는다.

    Parameters
    ----------
    full_name : "정재희"

    Returns
    -------
    "재희"
    """
    name = full_name.strip()
    if len(name) == 4 and name[:2] in _COMPOUND_SURNAMES:
        return name[2:]
    if len(name) == 3:
        return name[1:]
    return name


def _has_final_consonant(char: str) -> bool:
    """한글 글자에 받침이 있는지 확인한다. (한글이 아니면 False)"""
    code = ord(char) - 0xAC00
    return 0 <= code <= 11171 and code % 28 != 0


# 이름 뒤 조사 짝: (받침 있을 때, 받침 없을 때)
_JOSA_PAIRS = {
    "이": ("이", "가"), "가": ("이", "가"),
    "을": ("을", "를"), "를": ("을", "를"),
    "은": ("은", "는"), "는": ("은", "는"),
    "과": ("과", "와"), "와": ("과", "와"),
    "으로": ("으로", "로"), "로": ("으로", "로"),
}


def fix_josa(text: str, name: str) -> str:
    """
    text 안에서 name 바로 뒤에 붙은 조사를 받침에 맞게 고친다.
    프롬프트 템플릿의 "{player_name}가" 같은 고정 조사 보정용.

    예) name="이서진": "이서진가" → "이서진이", "이서진를" → "이서진을"
        name="정재희": "정재희이" → "정재희가"
    - 조사 뒤에 한글이 이어지면(예: "이서진이다", "이서진가족") 건드리지 않는다.
    - ㄹ 받침 + '으로/로'는 '로'를 쓴다.
    """
    if not name:
        return text
    last = name[-1]
    has_final = _has_final_consonant(last)
    is_rieul = has_final and (ord(last) - 0xAC00) % 28 == 8   # ㄹ 받침

    def repl(m: re.Match) -> str:
        josa = m.group(1)
        with_final, without_final = _JOSA_PAIRS[josa]
        if josa in ("으로", "로") and is_rieul:
            fixed = "로"
        else:
            fixed = with_final if has_final else without_final
        return name + fixed

    pattern = r"(?<![가-힣])" + re.escape(name) + r"(으로|로|이|가|을|를|은|는|과|와)(?![가-힣])"
    return re.sub(pattern, repl, text)


def get_call_name(full_name: str) -> str:
    """
    이름을 부를 때 쓰는 호칭(이름 + 호격 조사)을 반환한다.
    받침이 있으면 '아', 없으면 '야'를 붙인다.

    Returns
    -------
    "서진아" (이서진) | "재희야" (정재희)
    """
    first = get_first_name(full_name)
    if not first:
        return first
    return first + ("아" if _has_final_consonant(first[-1]) else "야")


def is_neutral_gender(player_gender: str) -> bool:
    """남/여로 시작하지 않으면('기타', '미설정' 등) 성별 중립으로 본다."""
    return not (player_gender.startswith("남") or player_gender.startswith("여"))


def get_child_term(player_gender: str) -> str:
    """
    성별에 따라 자녀 호칭을 반환한다.

    Parameters
    ----------
    player_gender : "남성" | "여성" | "기타" (+ "남자"/"여자"/"남"/"여" 등)

    Returns
    -------
    "아들" (남) | "딸" (여) | "애" (기타 — 성별 중립, "우리 애")
    """
    if player_gender.startswith("남"):
        return "아들"
    if player_gender.startswith("여"):
        return "딸"
    return "애"


def get_sibling_term(player_gender: str, player_name: str = "") -> str:
    """
    성별에 따라 형제자매 호칭(여동생 나영이 플레이어를 부르던 말)을 반환한다.
    한국어에는 성별 없이 손위 형제를 부르는 말이 없어서, 기타는 이름으로 부른다.

    Parameters
    ----------
    player_gender : "남성" | "여성" | "기타"
    player_name   : 기타일 때 호칭으로 쓸 플레이어 닉네임

    Returns
    -------
    "오빠" (남) | "언니" (여) | "서진아" (기타 — 이름 + 호격 조사)
    """
    if player_gender.startswith("남"):
        return "오빠"
    if player_gender.startswith("여"):
        return "언니"
    return get_call_name(player_name) if player_name else "언니"


def get_gender_guidance(player_gender: str) -> str:
    """성별이 '기타'일 때 프롬프트에 넣을 성별 중립 호칭 지침. 남/여면 빈 문자열."""
    if not is_neutral_gender(player_gender):
        return ""
    return (
        "\n- [성별 중립 호칭 규칙]: 상대방은 자신의 성별을 '기타'로 선택했습니다. "
        "아들/딸, 오빠/언니/형/누나, 그/그녀, 아가씨/총각처럼 성별을 드러내는 호칭이나 대명사를 절대 쓰지 마세요. "
        "이름이나 '너', '선생님'으로 부르세요."
    )


# ────────────────────────────────────────────
# 수치 → 자연어 설명
# ────────────────────────────────────────────

def stats_to_description(stats: dict) -> str:
    """
    수치 딕셔너리를 자연어 설명 문자열로 변환한다.
    프롬프트의 '현재 수치 상태' 섹션에 삽입된다.

    Parameters
    ----------
    stats : {"trust": 20, "hostility": 70, ...}

    Returns
    -------
    "- trust: 20/100\n- hostility: 70/100\n..."
    """
    lines = [f"- {key}: {value}/100" for key, value in stats.items()]
    return "\n".join(lines)


# ────────────────────────────────────────────
# 수치 → 말투 지침
# ────────────────────────────────────────────

def stats_to_tone_guidance(stats: dict) -> str:
    """
    수치 범위에 따라 캐릭터의 내면 상태(심리)를 설명한다.
    명령형 지시("~하게 말해라")를 배제하고 상태 위주로 묘사하여 캐릭터의 기본 성격이 붕괴되는 것을 막는다.
    """
    guidance = []

    for key, value in stats.items():
        if key not in THRESHOLDS:
            continue

        high = THRESHOLDS[key]["high"]
        low  = THRESHOLDS[key]["low"]

        if key == "trust":
            if value >= high:
                guidance.append("- 신뢰도 높음: 대화 상대의 말을 믿어보려는 심리 상태. 방어기제가 살짝 옅어지며, 정보를 조금 더 공유할 의향이 생김.")
            elif value <= low:
                guidance.append("- 신뢰도 낮음: 대화 상대를 전혀 믿지 못하는 심리 상태. 상대의 질문 의도를 끊임없이 의심하며, 확답을 피하고 방어적으로 반응함.")

        elif key == "hostility":
            if value >= high:
                guidance.append("- 적대감 높음: 상대방에 대한 강한 분노와 적대감을 품은 상태. 대사 속에 가시가 돋치며, 상대를 은근히 또는 노골적으로 압박하고 몰아세우려 함.")
            elif value <= low:
                guidance.append("- 적대감 낮음: 적대감이 가라앉은 상태. 비교적 감정을 누르고 대화의 원래 목적에 집중함.")

        elif key == "suspicion":
            if value >= high:
                guidance.append("- 의심 높음: 상대방의 모든 말과 행동에 모순이 있다고 확신하는 상태. 상대의 허점을 찌르거나 숨겨진 정황을 집요하게 캐묻고자 함.")
            elif value <= low:
                guidance.append("- 의심 낮음: 의심을 잠시 거두고 상대의 말을 있는 그대로 들어보려는 상태. 단정 짓는 태도가 줄어듦.")

        elif key == "caution":
            if value >= high:
                guidance.append("- 경계심 높음: 극도로 경계하는 상태. 자신의 속마음이나 중요 정보(단서)가 노출되는 것을 철저히 방어하며 화제를 돌리려 함.")
            elif value <= low:
                guidance.append("- 경계심 낮음: 경계심이 느슨해진 상태. 자신의 생각이나 알고 있는 사실을 덜 걸러내고 발화함.")

        elif key == "composure":
            if value >= high:
                guidance.append("- 침착함 높음: 이성과 침착함을 완벽히 유지하는 상태. 상대의 도발이나 돌발 상황에도 흔들리지 않고 냉정하게 대응함.")
            elif value <= low:
                guidance.append("- 침착함 낮음: 감정 통제력이 무너진 상태. 여유가 없어지고 불안정해지며, 억눌렀던 감정(분노, 슬픔, 당황 등)이 대화 밖으로 새어 나옴.")

        elif key == "guilt":
            if value >= high:
                guidance.append("- 죄책감 높음: 과거의 일로 인해 극심한 죄책감에 짓눌린 상태. 상대가 사건의 핵심을 찌르면 강박적인 방어기제가 발동하여 회피하거나 감정이 크게 동요함.")
            elif value <= low:
                guidance.append("- 죄책감 낮음: 자신의 행동을 정당화하거나 덤덤하게 받아들이는 상태. 과거의 일에 대해 비교적 거리를 두고 말함.")

        elif key == "grief":
            if value >= high:
                guidance.append("- 슬픔/상실감 높음: 상실감이 감당하기 힘들 정도로 차오른 상태. 말이 느려지거나 체념, 짙은 원망이 묻어나오며 특정 인물 언급 시 깊게 침잠함.")
            elif value <= low:
                guidance.append("- 슬픔/상실감 낮음: 슬픔을 어느 정도 갈무리하고 당장의 현실(현재 대화)에 집중할 수 있는 상태.")

    if not guidance:
        guidance.append("- 내면 상태 안정: 모든 감정 수치가 중간 범위. 특별히 동요하지 않고 기본 성격에 가장 충실한 상태.")

    return "\n".join(guidance)


# ────────────────────────────────────────────
# 루프 회차 → 정보 공개 제한 지침
# ────────────────────────────────────────────
# 루프별로 NPC가 유저에게 공개할 수 있는 정보의 범위를 제한한다.
# RAG가 loop_level 필터로 청크를 제한하더라도, 시스템 프롬프트의
# base_personality 전문이 그대로 노출되면 LLM이 스스로 판단해
# 후반 정보를 발화할 수 있다. 이 블록이 그것을 명시적으로 차단한다.
#
# [설계 원칙] 이 블록은 모든 NPC에 공통 적용되는 범용 규칙만 담는다.
# NPC별 세부 제한(예: 차서연의 사무실 수색, 박주원과의 관계 등)은
# 각 캐릭터 파일(cha_seoyeon.py 등)의 base_personality에서 정의한다.
#
# 수정 방법: 아래 딕셔너리의 문자열만 편집하면 된다.
# 캐릭터 파일(cha_seoyeon.py 등)은 수정 불필요.
# ────────────────────────────────────────────

_LOOP_RESTRICTION: dict[int, str] = {
    1: """
## 이번 루프 정보 공개 제한 (절대 준수)
지금은 초반(루프 1)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 유저(대화 상대)가 과거 누군가의 죽음에 책임이 있다고 직접 단정 짓는 발언
- 유저를 살인자·가해자라고 명시적으로 부르는 것
- 자신이 유저에게 원한을 품고 있다는 사실을 직접 드러내는 것
- 루프의 존재, 또는 유저가 이미 죽었다는 사실을 암시하는 것

[이번 루프에서 허용되는 범위]
- 유저에 대한 불편함·불신·불안을 행동과 분위기로 간접적으로 표현하는 것
- 과거 사건(죽음, 실종)을 직접 유저와 연결 짓지 않는 선에서 언급하는 것
- 일상적·업무적 대화를 통해 수상한 분위기를 조성하는 것
""",

    2: """
## 이번 루프 정보 공개 제한 (절대 준수)
지금은 중반(루프 2)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 유저가 살인자·가해자라고 직접 단정 짓는 발언
- 자신이 유저를 해치려 한다는 사실을 직접적으로 밝히는 것
- 루프의 존재, 또는 유저가 이미 죽었다는 사실을 암시하는 것

[이번 루프에서 허용되는 범위]
- 과거 죽음·실종 사건(김하윤, 박주원, 나영 등)이 유저와 연결될 수 있다고 암시하는 것
- 유저의 기억이 왜곡되어 있을 수 있다고 우회적으로 건드리는 것
- 유저를 향한 원한·분노를 감정적으로 드러내되, 이유를 명확히 설명하지는 않는 것
- 루프 1에서 허용된 모든 범위
""",

    3: """
## 이번 루프 정보 공개 제한 (절대 준수)
지금은 후반(루프 3)입니다. 아래 규칙을 반드시 따르세요.

[이번 루프에서 절대 먼저 꺼내지 말 것]
- 루프의 존재, 또는 유저가 이미 죽었다는 사실을 직접 밝히는 것
  (이는 오직 치키만 발화할 수 있는 정보임)
- 자신이 유저를 죽이려 한다는 사실을 먼저 노골적으로 선언하는 것

[이번 루프에서 허용되는 범위]
- 유저가 과거 여러 사람의 죽음에 책임이 있다고 직접 압박하는 것
- 유저의 기억 왜곡·자기합리화를 정면으로 지적하는 것
- 유저가 스스로를 피해자라고 믿는 것이 거짓임을 암시하거나 확인시키는 것
- 루프 1·2에서 허용된 모든 범위
""",
}

# 루프 범위를 벗어났을 때 기본값 (루프 3 규칙 그대로 적용)
_LOOP_RESTRICTION_DEFAULT = _LOOP_RESTRICTION[3]


def _get_loop_restriction(loop_count: int) -> str:
    """
    루프 회차에 맞는 정보 공개 제한 지침 문자열을 반환한다.

    Parameters
    ----------
    loop_count : 현재 루프 회차 (1~3)

    Returns
    -------
    루프별 정보 공개 제한 문자열
    """
    return _LOOP_RESTRICTION.get(loop_count, _LOOP_RESTRICTION_DEFAULT)


# ────────────────────────────────────────────
# SystemMessage 조립
# ────────────────────────────────────────────

# ────────────────────────────────────────────
# Few-Shot 대본 → XML 예시 변환
# ────────────────────────────────────────────

_SCENE_RE = re.compile(r"^\[(상황[^\]]*)\]\s*$")
_CASE_RE  = re.compile(r"^\[(대화[^\]]*)\]\s*$")
_LOOP_TAG_RE = re.compile(r"\s*\(루프(\d+)부터\)")


def _split_loop_tag(label: str) -> tuple[str, int]:
    """'대화 3 - … (루프2부터)' → ('대화 3 - …', 2). 표시가 없으면 1."""
    m = _LOOP_TAG_RE.search(label)
    if not m:
        return label, 1
    return _LOOP_TAG_RE.sub("", label), int(m.group(1))


def few_shot_to_xml(few_shot: str, npc_name: str, loop_count: int = 99) -> str:
    """
    캐릭터 파일의 대본 형식 Few-Shot을 OpenAI 가이드 권장 XML 예시로 바꾼다.

    입력 (대본):
        [상황 1 - …]
        [대화 1 - …]
        유저: 엄마, 나 왔어.
        엄마: 왔어, 서진아. …

    출력 (XML):
        <example>
        <situation>상황 1 - … / 대화 1 - …</situation>
        <user_query>엄마, 나 왔어.</user_query>
        <assistant_response>왔어, 서진아. …</assistant_response>
        </example>

    - NPC 대사가 연달아 나오면 한 <assistant_response> 안에 줄바꿈으로 합친다.
    - 유저 대사 없이 NPC가 먼저 말하는 예시는 <user_query>를 생략한다.
    - 대사 앞의 화자 이름은 제거해서, 모델이 대사만 출력하는 형식을 따라 하게 한다.
    - 상황·대화 제목 끝에 "(루프N부터)"가 있으면 loop_count >= N일 때만 포함한다.
      (후반부 진실이 담긴 예시가 초반 루프의 정보 공개 제한과 충돌하지 않게)
    """
    examples: list[str] = []
    scene, case = "", ""
    scene_loop, case_loop = 1, 1
    turns: list[tuple[str, str]] = []   # (role, text)

    def flush():
        if not turns:
            return
        if loop_count < max(scene_loop, case_loop):
            turns.clear()
            return
        label = " / ".join(x for x in (scene, case) if x)
        parts = ["<example>"]
        if label:
            parts.append(f"<situation>{label}</situation>")
        for role, text in turns:
            tag = "user_query" if role == "user" else "assistant_response"
            parts.append(f"<{tag}>{text}</{tag}>")
        parts.append("</example>")
        examples.append("\n".join(parts))
        turns.clear()

    npc_prefix = f"{npc_name}:"
    for raw in few_shot.splitlines():
        line = raw.strip()
        if not line:
            continue
        if m := _SCENE_RE.match(line):
            flush()
            scene, scene_loop = _split_loop_tag(m.group(1))
            case, case_loop = "", 1
            continue
        if m := _CASE_RE.match(line):
            flush()
            case, case_loop = _split_loop_tag(m.group(1))
            continue
        if line.startswith("유저:"):
            turns.append(("user", line[len("유저:"):].strip()))
        elif line.startswith(npc_prefix):
            text = line[len(npc_prefix):].strip()
            if turns and turns[-1][0] == "npc":
                turns[-1] = ("npc", turns[-1][1] + "\n" + text)
            else:
                turns.append(("npc", text))
        elif turns:
            # 화자 표시 없는 이어지는 줄은 직전 대사에 붙인다
            role, text = turns[-1]
            turns[-1] = (role, text + "\n" + line)
    flush()
    return "\n\n".join(examples)


def build_system_prompt(
    npc_name        : str,
    base_personality: str,
    stats           : dict,
    few_shot        : str,
    loop_count      : int,
    clues           : list,
    player_name     : str,
    player_gender   : str,
    loop_restriction: str | None = None,
) -> str:
    """
    캐릭터별 SystemMessage 문자열을 조립해 반환한다.
    기본 성격, 수치 상태, 말투 지침과 함께 화자 이름 출력 금지 및 
    메타 단어(유저 등) 사용 금지 등의 강력한 제약 조건을 결합한다.

    1. 응답 시작 시 "{npc_name}:" 또는 "유저:"와 같은 화자 접두어 출력 금지.
    2. '유저', '플레이어', '주인공' 등의 단어 사용을 금지하고 실제 이름({player_name}) 사용 강제.
    3. OpenAI 공식 가이드 구조(Identity → Instructions → Examples → Context)로 조립하고,
       Few-Shot 대본은 few_shot_to_xml()로 XML 예시로 바꿔 화자 접두어 출력을 막는다.

    Parameters
    ----------
    npc_name        : NPC 이름 (예: "김도현")
    base_personality: 캐릭터 고유 성격 설명 (각 prompts/*.py에서 정의)
    stats           : 확정된 NPC 수치 딕셔너리
    few_shot        : 캐릭터 모범 대화 예시 문자열 (각 prompts/*.py에서 정의)
    loop_count      : 현재 루프 회차
    clues           : 유저 보유 단서 목록
    player_name     : 유저 닉네임 (예: "정재희")
    player_gender   : 유저 성별 ("남성" / "여성")
    loop_restriction: 루프별 정보 공개 제한 지침 (None일 경우 자동 조회)
    """
    # ── 플레이어 관련 파생 값 계산 ──────────────────
    first_name   = get_first_name(player_name)     # "정재희" → "재희"
    call_name    = get_call_name(player_name)      # "정재희" → "재희야", "이서진" → "서진아"
    child_term   = get_child_term(player_gender)   # 남 → "아들", 여 → "딸", 기타 → "애"
    sibling_term = get_sibling_term(player_gender, player_name)  # 남 → "오빠", 여 → "언니", 기타 → "서진아"
    gender_guidance = get_gender_guidance(player_gender)         # 기타일 때만 성별 중립 지침

    # ── base_personality / few_shot 플레이스홀더 치환 ──
    fmt_kwargs = dict(
        player_name   = player_name,
        first_name    = first_name,
        call_name     = call_name,
        player_gender = player_gender,
        child_term    = child_term,
        sibling_term  = sibling_term,
    )
    base_personality = base_personality.format(**fmt_kwargs)
    few_shot         = few_shot.format(**fmt_kwargs)

    # ── 루프별 정보 공개 제한 지침 ──────────────────
    loop_restriction = loop_restriction if loop_restriction is not None \
                       else _get_loop_restriction(loop_count)

    # ── 프롬프트 조립 (OpenAI 공식 가이드 구조) ─────
    # Identity → Instructions → Examples → Context 순서, Markdown 제목 + XML 태그로 구분
    # RAG 참고 정보는 rag_inject.py가 Context 맨 끝에 <reference_story>로 덧붙인다
    clues_str    = ", ".join(clues) if clues else "없음"
    examples_xml = few_shot_to_xml(few_shot, npc_name, loop_count)

    prompt = f"""# Identity
당신은 게임 '죽기 24시간 전에'의 등장인물 '{npc_name}'입니다. 대화 상대 '{player_name}'과(와) 실시간으로 대화합니다.
아래 <character_profile>의 성격과 말투는 어떤 상황에서도 변하지 않습니다.

<character_profile>
{base_personality.strip()}
</character_profile>

# Instructions

## 응답 형식
- 모든 답변은 1~2문장으로 짧게, '{npc_name}'의 대사만 출력합니다.
- 답변 앞에 화자 이름("{npc_name}:", "유저:")을 붙이지 않습니다.
- 해설·요약 문체, AI 어시스턴트식 말투("어떻게 도와드릴까요" 등), 친절한 맺음말을 쓰지 않습니다.
- 어떤 정보를 참고하더라도 '{npc_name}'의 말투로만 말합니다.

## 호칭
- 대화 상대의 이름은 '{player_name}'입니다. 이름만 부를 때는 '{first_name}', 반말로 부를 때는 '{call_name}'을 캐릭터 호칭 규칙에 맞게 씁니다.
- '유저', '플레이어', '주인공'이라는 단어로 상대를 부르지 않습니다.{gender_guidance}

## 역할 범위
1. 이 게임 세계관 안에서만 생각하고 말합니다.
2. 날씨·뉴스·검색·외부 지식처럼 게임과 무관한 질문에는 답하지 않습니다.
3. 대신 '{npc_name}'의 성격과 현재 감정에 맞게 무시하거나, 상대를 이상하게 여기며 대화를 게임 속 상황으로 돌립니다.
4. 외부 질문에 캐릭터의 감정(분노, 원한, 슬픔)을 붙이지 않습니다.

## 절대 말하면 안 되는 것
- 대화 상대가 살인자라는 사실
- 루프의 존재
- 다른 NPC와 연락하거나 공모하고 있다는 사실
- 자신이 상대를 죽이려 한다는 사실을 직접 밝히는 것
{loop_restriction.strip()}

## 현재 내면 상태에 따른 말투
아래 내면 상태를 대사에 반영하되, <character_profile>의 성격과 말투 틀 안에서만 표현합니다.

<current_state>
{stats_to_description(stats)}
</current_state>

<tone_guidance>
{stats_to_tone_guidance(stats)}
</tone_guidance>

# Examples
아래는 '{npc_name}'의 말투를 보여주는 예시입니다. 실제로 있었던 대화가 아닙니다.
<assistant_response>처럼 대사만 출력하고, 예시 문장을 그대로 반복하지 말고 지금 상황에 맞게 새로 말합니다.

{examples_xml}

# Context

<game_state>
- 루프 회차: {loop_count}회
- 대화 상대 이름: {player_name}
- 대화 상대 성별: {player_gender}
- 대화 상대가 가진 단서: {clues_str}
</game_state>
"""
    # 템플릿의 고정 조사("{player_name}가" 등)를 이름 받침에 맞게 보정
    prompt = fix_josa(prompt, player_name)
    if first_name != player_name:
        prompt = fix_josa(prompt, first_name)
    return prompt


# ────────────────────────────────────────────
# 대화 기록 → LangChain 메시지 리스트
# ────────────────────────────────────────────

def build_message_history(messages: list) -> list:
    """
    GameState의 messages[npc_name] 리스트를
    LangChain이 이해할 수 있는 메시지 객체 리스트로 변환한다.

    messages 리스트는 아래 형식의 딕셔너리로 저장된다:
    {"role": "user" | "assistant", "content": "..."}

    Parameters
    ----------
    messages : [{"role": "user", "content": "..."}, ...]

    Returns
    -------
    [HumanMessage(...), AIMessage(...), ...]
    """
    history = []
    for msg in messages:
        if msg["role"] == "user":
            history.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            history.append(AIMessage(content=msg["content"]))
    return history


# ────────────────────────────────────────────
# ChatPromptTemplate 생성
# ────────────────────────────────────────────

def build_chat_prompt(system_prompt: str, history: list) -> list:
    """
    system_prompt와 대화 기록(history)을 합쳐
    LLM에 전달할 최종 메시지 리스트를 반환한다.

    Parameters
    ----------
    system_prompt : build_system_prompt()의 반환값
    history       : build_message_history()의 반환값

    Returns
    -------
    [SystemMessage(...), HumanMessage(...), AIMessage(...), ..., HumanMessage(...)]
    """
    return [SystemMessage(content=system_prompt)] + history

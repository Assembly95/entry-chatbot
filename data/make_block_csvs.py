import os
import re
import csv

INPUT_FILE = "block_name_id_match.js"
OUTPUT_ROOT = "dataset"

# 제외할 블록 ID들 (교사용/관리용)
EXCLUDE_BLOCKS = {
    "check_block_execution",
    "check_goal_success",
    "register_score",
    "check_variable_by_name",
    "show_prompt",
    "check_lecture_goal",
    "is_answer_submited"
}

os.makedirs(OUTPUT_ROOT, exist_ok=True)

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

current_category = "uncategorized"
pattern = re.compile(r'(\w+):\s*".*?"')

for line in lines:
    line = line.strip()

    # 카테고리 주석 감지 (예: // block_start.js)
    if line.startswith("//"):
        current_category = line.strip("/ ").replace(".js", "")
        # "block_" 접두어 제거
        if current_category.startswith("block_"):
            current_category = current_category.replace("block_", "")
        continue

    # 블록 ID 추출
    match = pattern.match(line)
    if match:
        block_id = match.group(1)

        # 제외 블록이면 건너뜀
        if block_id in EXCLUDE_BLOCKS:
            continue

        # 카테고리 폴더 생성
        category_dir = os.path.join(OUTPUT_ROOT, current_category)
        os.makedirs(category_dir, exist_ok=True)

        # CSV 파일 생성
        file_path = os.path.join(category_dir, f"{block_id}.csv")
        with open(file_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "task_type", "block_id", "question", "cot_steps", "answer"])
            for i in range(1, 6):
                writer.writerow([
                    f"{block_id}_{i:03d}",
                    "explain",   # 기본 explain, 나중에 nl2dsl 등으로 교체 가능
                    block_id,
                    "",
                    "",
                    ""
                ])

print(f"✅ 학생용 블록만 카테고리별 CSV로 '{OUTPUT_ROOT}' 폴더에 생성 완료!")

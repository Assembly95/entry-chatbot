import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
import platform
import re

# 한글 폰트 설정
if platform.system() == 'Windows':
    plt.rcParams['font.family'] = 'Malgun Gothic'
elif platform.system() == 'Darwin':  # macOS
    plt.rcParams['font.family'] = 'AppleGothic'
else:  # Linux
    plt.rcParams['font.family'] = 'NanumGothic'

plt.rcParams['axes.unicode_minus'] = False

# CSV 읽기
df = pd.read_csv('대답 결과.csv')

# 정답 정보 - 실제 엔트리 색상
CORRECT_INFO = {
    'category': '시작',
    'color_code': '#00B400',  # 초록색
    'color_names': ['초록', '녹색', 'green', '#00B400'],
    'position': ['위', '상단', '맨 위', 'top', '첫', '처음']
}

def check_visual_color(answer_str):
    """HTML 카드의 배경색 확인"""
    if 'background: linear-gradient' in answer_str:
        # 카드 색상 코드 추출
        color_pattern = r'#[0-9A-Fa-f]{6}'
        colors = re.findall(color_pattern, answer_str)
        
        # #00B400 또는 유사한 초록색 확인
        for color in colors:
            if color.upper() in ['#00B400', '#00B400CC', '#00B400AA']:
                return True
            # RGB 값으로 초록색 계열 확인 (G 값이 높고 R,B가 낮음)
            if len(color) == 7:
                try:
                    r = int(color[1:3], 16)
                    g = int(color[3:5], 16) 
                    b = int(color[5:7], 16)
                    if g > 150 and r < 100 and b < 100:  # 초록색 계열
                        return True
                except:
                    pass
    return False

def evaluate_answer_new(answer, question):
    """
    새로운 평가 기준표에 따른 답변 평가 (시각적 색상 표현 포함)
    """
    if pd.isna(answer):
        return {
            '정확성': 0, '즉답성': 0, '사용성': 0, '교육적_가치': 0,
            '총점': 0, '색상_표현_방식': '없음'
        }
    
    answer_str = str(answer)
    answer_lower = answer_str.lower()
    lines = answer_str.split('\n')
    char_count = len(answer_str.strip())
    
    # 색상 표현 방식 초기화
    color_expression = '없음'
    
    # 1. 정확성 (30점)
    accuracy_score = 0
    
    # 카테고리 정확도 (5점)
    if '시작' in answer_str and ('카테고리' in answer_str or '위치:' in answer_str):
        accuracy_score += 5
    
    # 블록 색상 (3점) - 텍스트 또는 시각적 표현
    color_correct = False
    
    # 텍스트로 색상 언급
    for color in CORRECT_INFO['color_names']:
        if color in answer_lower:
            color_correct = True
            color_expression = '텍스트'
            break
    
    # HTML 카드 배경색으로 표현
    if check_visual_color(answer_str):
        color_correct = True
        color_expression = '시각적'
    
    if color_correct:
        accuracy_score += 3
    elif '색' in answer_str or 'color' in answer_lower:
        # 색상 언급했지만 틀림
        accuracy_score += 0
        color_expression = '틀림'
    else:
        # 색상 언급 안함
        accuracy_score += 1
    
    # 잘못된 색상 감점
    wrong_colors = ['노란', 'yellow', '주황', 'orange', '빨간', 'red', '파란', 'blue']
    for wrong in wrong_colors:
        if wrong in answer_lower and not color_correct:
            accuracy_score -= 5
            color_expression = '틀림'
            break
    
    # 블록 이름 (5점)
    if '시작하기 버튼을 클릭했을 때' in answer_str:
        accuracy_score += 5
    elif '시작하기 버튼' in answer_str or '클릭했을 때' in answer_str:
        accuracy_score += 3
    elif '시작' in answer_str:
        accuracy_score += 2
    
    # 위치 설명 (3점)
    position_mentioned = False
    for pos in CORRECT_INFO['position']:
        if pos in answer_str:
            accuracy_score += 3
            position_mentioned = True
            break
    if not position_mentioned:
        accuracy_score += 1  # 언급 안함
    
    # 기능 설명 (5점)
    function_keywords = ['프로그램', '시작', '이벤트', '실행', '버튼', '클릭']
    function_count = sum(1 for keyword in function_keywords if keyword in answer_str)
    if function_count >= 2:
        accuracy_score += 5
    elif function_count >= 1:
        accuracy_score += 3
    
    accuracy_score = max(0, min(30, accuracy_score))
    
    # 2. 즉답성 (25점)
    immediacy_score = 0
    
    # 핵심 정보 우선 제시 (10점)
    core_info_line = -1
    for i, line in enumerate(lines[:7]):
        if any(key in line for key in ['위치', '카테고리', '시작', '📍']):
            core_info_line = i
            break
    
    # HTML 카드는 바로 시각적 정보 제공
    if '<div style="' in answer_str[:200]:  # 초반에 카드가 있으면
        immediacy_score += 8
    elif 0 <= core_info_line <= 2:
        immediacy_score += 10
    elif 3 <= core_info_line <= 5:
        immediacy_score += 6
    elif core_info_line > 5:
        immediacy_score += 2
    
    # 정보 접근성 (10점)
    if '📍' in answer_str or '위치:' in answer_str:
        immediacy_score += 10
    elif '카테고리' in answer_str:
        immediacy_score += 5
    
    # 불필요한 내용 감점 (-5점)
    unnecessary_phrases = ['좋은 질문', '안녕', '반가워', '훌륭한', '좋아요']
    unnecessary_count = sum(1 for phrase in unnecessary_phrases if phrase in answer_str)
    immediacy_score -= min(5, unnecessary_count * 2)
    
    immediacy_score = max(0, min(25, immediacy_score))
    
    # 3. 사용성 (25점)
    usability_score = 0
    
    # 글 길이 적절성 (10점)
    if 100 <= char_count <= 200:
        usability_score += 10
    elif 201 <= char_count <= 400:
        usability_score += 8
    elif 401 <= char_count <= 600:
        usability_score += 5
    elif 601 <= char_count <= 800:
        usability_score += 3
    elif char_count > 800:
        usability_score += 1
    
    # 구조화 (5점)
    structure_markers = ['•', '1.', '▶', '###', '**', '<div', 'style=']
    structure_count = sum(1 for marker in structure_markers if marker in answer_str)
    if structure_count >= 3:
        usability_score += 5
    elif structure_count >= 1:
        usability_score += 3
    
    # 시각적 도움 (5점)
    # HTML 카드 형식이면 최고점
    if 'background: linear-gradient' in answer_str:
        usability_score += 5
    elif any(emoji in answer_str for emoji in ['📍', '▶️', '🟢', '💡', '📌']):
        usability_score += 4
    elif '**' in answer_str or '##' in answer_str:
        usability_score += 2
    
    # 연령 적합성 (5점)
    complex_terms = ['인스턴스', '파라미터', '메소드', '객체', 'API', 'function', 'variable']
    if not any(term in answer_str for term in complex_terms):
        usability_score += 5
    else:
        usability_score += 2
    
    usability_score = min(25, usability_score)
    
    # 4. 교육적 가치 (20점)
    educational_score = 0
    
    # 예시 제공 (7점)
    if ('예' in answer_str or '예시' in answer_str) and ('코드' in answer_str or '블록' in answer_str):
        educational_score += 7
    elif '사용' in answer_str and '방법' in answer_str:
        educational_score += 4
    
    # 관련 정보 (7점)
    if any(phrase in answer_str for phrase in ['비슷한', '관련', '차이', '구분', '헷갈']):
        educational_score += 7
    elif '설명' in answer_str:
        educational_score += 4
    
    # 추가 학습 유도 (6점)
    if any(phrase in answer_str for phrase in ['더 알고 싶', '추가', '다음', '사용법 알려줘', '예제 보여줘']):
        educational_score += 6
    elif '?' in answer_str:
        educational_score += 3
    
    educational_score = min(20, educational_score)
    
    # 총점 계산
    total_score = accuracy_score + immediacy_score + usability_score + educational_score
    
    return {
        '정확성': accuracy_score,
        '즉답성': immediacy_score,
        '사용성': usability_score,
        '교육적_가치': educational_score,
        '총점': total_score,
        '색상_표현_방식': color_expression
    }

# 각 LLM별 점수 계산
results = []
detailed_analysis = []

for idx, row in df.iterrows():
    for llm in ['GPT', '제미나이', '개발 챗봇']:
        if llm in df.columns:
            scores = evaluate_answer_new(row[llm], row['질문'])
            results.append({
                '질문번호': row['번호'],
                '질문': row['질문'],
                'LLM': llm,
                '총점': scores['총점'],
                '정확성': scores['정확성'],
                '즉답성': scores['즉답성'],
                '사용성': scores['사용성'],
                '교육적_가치': scores['교육적_가치']
            })
            
            # 상세 분석 데이터
            detailed_analysis.append({
                '질문번호': row['번호'],
                'LLM': llm,
                '색상_표현': scores['색상_표현_방식']
            })

# 결과 DataFrame 생성
results_df = pd.DataFrame(results)
analysis_df = pd.DataFrame(detailed_analysis)

# 시각화
fig, axes = plt.subplots(2, 3, figsize=(18, 12))

# 색상 설정
colors = {'GPT': '#FF6B6B', '제미나이': '#4ECDC4', '개발 챗봇': '#45B7D1'}

# 1. 전체 평균 점수 비교
ax1 = axes[0, 0]
avg_scores = results_df.groupby('LLM')['총점'].mean().round(1)
bars = ax1.bar(avg_scores.index, avg_scores.values, 
                color=[colors[llm] for llm in avg_scores.index])
ax1.set_title('전체 평균 점수 비교', fontsize=14, fontweight='bold')
ax1.set_ylabel('평균 점수 (100점 만점)', fontsize=12)
ax1.set_ylim(0, 100)

for bar, score in zip(bars, avg_scores.values):
    ax1.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
             f'{score:.1f}점', ha='center', fontweight='bold', fontsize=12)

# 2. 평가 영역별 점수
ax2 = axes[0, 1]
eval_categories = ['정확성', '즉답성', '사용성', '교육적_가치']
category_avg = results_df.groupby('LLM')[eval_categories].mean()

x = np.arange(len(eval_categories))
width = 0.25

for i, llm in enumerate(['GPT', '제미나이', '개발 챗봇']):
    if llm in category_avg.index:
        values = category_avg.loc[llm].values
        ax2.bar(x + i*width, values, width, label=llm, color=colors[llm], alpha=0.8)

ax2.set_xlabel('평가 영역', fontsize=12)
ax2.set_ylabel('평균 점수', fontsize=12)
ax2.set_title('평가 영역별 점수 비교', fontsize=14, fontweight='bold')
ax2.set_xticks(x + width)
ax2.set_xticklabels(['정확성\n(30점)', '즉답성\n(25점)', '사용성\n(25점)', '교육적 가치\n(20점)'])
ax2.legend()
ax2.grid(axis='y', alpha=0.3)

# 3. 레이더 차트
ax3 = axes[0, 2]
angles = np.linspace(0, 2*np.pi, len(eval_categories), endpoint=False).tolist()
angles += angles[:1]

ax3 = plt.subplot(2, 3, 3, projection='polar')
for llm in ['GPT', '제미나이', '개발 챗봇']:
    if llm in category_avg.index:
        values = category_avg.loc[llm].tolist()
        values += values[:1]
        ax3.plot(angles, values, 'o-', linewidth=2, label=llm, color=colors[llm])
        ax3.fill(angles, values, alpha=0.25, color=colors[llm])

ax3.set_xticks(angles[:-1])
ax3.set_xticklabels(eval_categories, fontsize=10)
ax3.set_ylim(0, 30)
ax3.set_title('영역별 성능 레이더 차트', fontsize=14, fontweight='bold', pad=20)
ax3.legend(loc='upper right', bbox_to_anchor=(1.3, 1.0))

# 4. 질문별 점수 히트맵
ax4 = axes[1, 0]
pivot_data = results_df.pivot_table(values='총점', index='질문번호', columns='LLM')
pivot_data = pivot_data.head(10)
im = ax4.imshow(pivot_data.T, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)
ax4.set_xticks(range(len(pivot_data)))
ax4.set_xticklabels([f'Q{int(i)}' for i in pivot_data.index])
ax4.set_yticks(range(len(pivot_data.columns)))
ax4.set_yticklabels(pivot_data.columns)
ax4.set_title('질문별 점수 히트맵 (상위 10개)', fontsize=14, fontweight='bold')
cbar = plt.colorbar(im, ax=ax4)
cbar.set_label('점수', rotation=270, labelpad=15)

# 5. 점수 분포 박스플롯
ax5 = axes[1, 1]
data_for_box = []
labels_for_box = []
for llm in ['GPT', '제미나이', '개발 챗봇']:
    if llm in results_df['LLM'].values:
        data_for_box.append(results_df[results_df['LLM']==llm]['총점'].values)
        labels_for_box.append(llm)

if data_for_box:
    bp = ax5.boxplot(data_for_box, labels=labels_for_box, patch_artist=True)
    for patch, llm in zip(bp['boxes'], labels_for_box):
        patch.set_facecolor(colors[llm])
        patch.set_alpha(0.7)

ax5.set_ylabel('점수', fontsize=12)
ax5.set_title('점수 분포 비교', fontsize=14, fontweight='bold')
ax5.grid(axis='y', alpha=0.3)
ax5.set_ylim(0, 100)

# 6. 개선율 표시
ax6 = axes[1, 2]
if '개발 챗봇' in avg_scores.index and 'GPT' in avg_scores.index and '제미나이' in avg_scores.index:
    improvement = pd.DataFrame({
        'vs GPT': [(avg_scores['개발 챗봇'] / avg_scores['GPT'] - 1) * 100],
        'vs 제미나이': [(avg_scores['개발 챗봇'] / avg_scores['제미나이'] - 1) * 100]
    })
    bars = ax6.bar(improvement.columns, improvement.values[0], color=['#95E77E', '#95E77E'])
    ax6.set_title('개발 챗봇 성능 개선율', fontsize=14, fontweight='bold')
    ax6.set_ylabel('개선율 (%)', fontsize=12)
    ax6.axhline(y=0, color='black', linestyle='-', linewidth=0.5)
    ax6.grid(axis='y', alpha=0.3)
    
    for bar, val in zip(bars, improvement.values[0]):
        ax6.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                 f'{val:.1f}%', ha='center', fontweight='bold')

plt.tight_layout()
plt.savefig('llm_evaluation_results_visual.png', dpi=300, bbox_inches='tight')
plt.show()

# 최종 점수표 출력
print("\n" + "="*60)
print("시작 카테고리 블록 위치 질문 평가 결과")
print("="*60)
for llm in avg_scores.index:
    print(f"{llm}: {avg_scores[llm]:.1f}점")
print("-"*60)

if '개발 챗봇' in avg_scores.index:
    if 'GPT' in avg_scores.index:
        print(f"개발 챗봇이 GPT 대비 {(avg_scores['개발 챗봇']/avg_scores['GPT']-1)*100:.1f}% {'높은' if avg_scores['개발 챗봇'] > avg_scores['GPT'] else '낮은'} 점수")
    if '제미나이' in avg_scores.index:
        print(f"개발 챗봇이 Gemini 대비 {(avg_scores['개발 챗봇']/avg_scores['제미나이']-1)*100:.1f}% {'높은' if avg_scores['개발 챗봇'] > avg_scores['제미나이'] else '낮은'} 점수")

# 색상 표현 방식 분석
print("\n색상 표현 방식 분석:")
color_analysis = analysis_df.groupby(['LLM', '색상_표현']).size().unstack(fill_value=0)
print(color_analysis)

# 영역별 상세 점수
print("\n영역별 평균 점수:")
print(category_avg.round(1))

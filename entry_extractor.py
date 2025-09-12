# 1. 필요한 라이브러리 설치
# 터미널/명령프롬프트에서 실행:
# pip install PyPDF2 python-docx

import json
import re
import PyPDF2
from typing import List, Dict, Any
import os

# PDF에서 텍스트 추출하는 함수
def extract_text_from_pdf(pdf_path: str) -> str:
    """PDF 파일에서 텍스트 추출"""
    text = ""
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
    except Exception as e:
        print(f"PDF 읽기 오류: {e}")
    return text

class EntryEducationDataExtractor:
    def __init__(self):
        self.extracted_data = []
        
    def extract_qa_pairs(self, document_content: str, lesson_title: str) -> List[Dict[str, Any]]:
        """교육자료에서 Q&A 쌍을 추출"""
        qa_pairs = []
        
        # 1. 기본 정보 추출
        basic_info = self.extract_basic_info(document_content)
        qa_pairs.extend(self.create_basic_qa(basic_info, lesson_title))
        
        # 2. 단계별 설명 추출
        steps = self.extract_steps(document_content)
        qa_pairs.extend(self.create_step_qa(steps, lesson_title))
        
        # 3. 팁과 체크포인트 추출
        tips = self.extract_tips_and_checkpoints(document_content)
        qa_pairs.extend(self.create_tip_qa(tips, lesson_title))
        
        return qa_pairs
    
    def extract_basic_info(self, content: str) -> Dict[str, str]:
        """기본 수업 정보 추출"""
        info = {}
        
        # 요약 추출
        summary_match = re.search(r'요약\s*\n(.*?)(?=\n난이도|목표|$)', content, re.DOTALL)
        if summary_match:
            info['summary'] = summary_match.group(1).strip()
        
        # 목표 추출
        goal_match = re.search(r'목표\s*\n(.*?)(?=\n프로그래밍|목차|$)', content, re.DOTALL)
        if goal_match:
            info['goal'] = goal_match.group(1).strip()
        
        # 프로그래밍 요소 추출
        programming_match = re.search(r'프로그래밍 요소\s*\n(.*?)(?=\n목차|$)', content, re.DOTALL)
        if programming_match:
            info['programming_elements'] = programming_match.group(1).strip()
        
        return info
    
    def extract_steps(self, content: str) -> List[Dict[str, str]]:
        """단계별 내용 추출"""
        steps = []
        
        # 숫자로 시작하는 단계들 찾기
        step_pattern = r'(\d+\.\s+[^0-9\n]+?)\s*\n(.*?)(?=\n\d+\.\s+|\nTip|\n레벨업|\n마무리|$)'
        matches = re.findall(step_pattern, content, re.DOTALL)
        
        for title, description in matches:
            if len(description.strip()) > 20:  # 의미있는 설명만
                steps.append({
                    'title': title.strip(),
                    'description': description.strip()
                })
        
        return steps
    
    def extract_tips_and_checkpoints(self, content: str) -> List[Dict[str, str]]:
        """Tip과 Check point 추출"""
        tips = []
        
        # Tip 추출
        tip_pattern = r'Tip\s+([^\n]+)\s*\n(.*?)(?=\nTip|\nCheck point!|\n\d+\.|\n레벨업|\n마무리|$)'
        tip_matches = re.findall(tip_pattern, content, re.DOTALL)
        
        for title, description in tip_matches:
            tips.append({
                'type': 'tip',
                'title': title.strip(),
                'description': description.strip()
            })
        
        return tips
    
    def create_basic_qa(self, info: Dict[str, str], lesson_title: str) -> List[Dict[str, Any]]:
        """기본 정보 Q&A 생성"""
        qa_pairs = []
        
        if 'summary' in info and info['summary']:
            qa_pairs.append({
                "messages": [
                    {"role": "user", "content": f"'{lesson_title}' 수업이 무엇에 대한 수업인지 설명해주세요."},
                    {"role": "assistant", "content": info['summary']}
                ]
            })
        
        if 'goal' in info and info['goal']:
            qa_pairs.append({
                "messages": [
                    {"role": "user", "content": f"'{lesson_title}' 수업의 학습 목표는 무엇인가요?"},
                    {"role": "assistant", "content": info['goal']}
                ]
            })
        
        return qa_pairs
    
    def create_step_qa(self, steps: List[Dict[str, str]], lesson_title: str) -> List[Dict[str, Any]]:
        """단계별 Q&A 생성"""
        qa_pairs = []
        
        for step in steps:
            qa_pairs.append({
                "messages": [
                    {"role": "user", "content": f"'{lesson_title}' 수업에서 '{step['title']}' 단계에서는 무엇을 하나요?"},
                    {"role": "assistant", "content": step['description']}
                ]
            })
        
        return qa_pairs
    
    def create_tip_qa(self, tips: List[Dict[str, str]], lesson_title: str) -> List[Dict[str, Any]]:
        """팁 Q&A 생성"""
        qa_pairs = []
        
        for tip in tips:
            qa_pairs.append({
                "messages": [
                    {"role": "user", "content": f"엔트리에서 {tip['title']}에 대해 설명해주세요."},
                    {"role": "assistant", "content": tip['description']}
                ]
            })
        
        return qa_pairs

# 메인 실행 함수
def main():
    """메인 실행 함수 - 실제로 이 부분을 실행하세요"""
    
    # 1. PDF 파일들이 있는 폴더 경로 설정
    pdf_folder = "pdf_files"  # PDF 파일들을 넣어둘 폴더
    
    # 폴더가 없으면 생성
    if not os.path.exists(pdf_folder):
        os.makedirs(pdf_folder)
        print(f"'{pdf_folder}' 폴더를 생성했습니다. 여기에 PDF 파일들을 넣어주세요.")
        return
    
    # 2. 추출기 초기화
    extractor = EntryEducationDataExtractor()
    all_qa_pairs = []
    
    # 3. PDF 파일들 처리
    pdf_files = [f for f in os.listdir(pdf_folder) if f.endswith('.pdf')]
    
    if not pdf_files:
        print(f"'{pdf_folder}' 폴더에 PDF 파일이 없습니다.")
        return
    
    print(f"{len(pdf_files)}개의 PDF 파일을 처리합니다...")
    
    for pdf_file in pdf_files:
        print(f"처리 중: {pdf_file}")
        
        # PDF에서 텍스트 추출
        pdf_path = os.path.join(pdf_folder, pdf_file)
        content = extract_text_from_pdf(pdf_path)
        
        # 파일명에서 수업 제목 추출 (확장자 제거)
        lesson_title = pdf_file.replace('.pdf', '')
        
        # Q&A 쌍 추출
        qa_pairs = extractor.extract_qa_pairs(content, lesson_title)
        all_qa_pairs.extend(qa_pairs)
        
        print(f"  → {len(qa_pairs)}개의 Q&A 쌍 추출됨")
    
    # 4. 결과 저장
    if all_qa_pairs:
        output_file = 'entry_finetuning_data.jsonl'
        with open(output_file, 'w', encoding='utf-8') as f:
            for qa in all_qa_pairs:
                f.write(json.dumps(qa, ensure_ascii=False) + '\n')
        
        print(f"\n총 {len(all_qa_pairs)}개의 Q&A 쌍이 '{output_file}'에 저장되었습니다.")
        
        # 샘플 출력
        print("\n=== 생성된 데이터 샘플 ===")
        for i, qa in enumerate(all_qa_pairs[:3]):  # 처음 3개만 출력
            print(f"\n샘플 {i+1}:")
            print(f"Q: {qa['messages'][0]['content']}")
            print(f"A: {qa['messages'][1]['content'][:100]}...")
    else:
        print("추출된 Q&A 쌍이 없습니다. PDF 내용을 확인해주세요.")

# 실행부
if __name__ == "__main__":
    main()

# =========================
# 실행 방법 안내:
# =========================
# 
# 1. 이 파일을 'entry_extractor.py'로 저장
# 2. 터미널에서: pip install PyPDF2
# 3. 'pdf_files' 폴더 생성하고 엔트리 PDF 파일들 넣기
# 4. 터미널에서: python entry_extractor.py
# 
# 결과물: entry_finetuning_data.jsonl 파일 생성됨
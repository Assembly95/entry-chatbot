import json
import re
from typing import List, Dict, Any

class BlockCodingDataFilter:
    def __init__(self):
        # 블록 코딩 관련 키워드들
        self.block_coding_keywords = [
            '블록', '코딩', '프로그래밍', '변수', '함수', '신호', '이벤트', '반복',
            '조건', '움직임', '모양', '소리', '좌표', '복제본', '오브젝트',
            '도장 찍기', '말하기', '기다리기', '순차', '반복하기', '만일',
            '계속 반복하기', '입력받기', '클릭', '키보드', '마우스',
            '시작하기', '정지하기', '숨기기', '보이기', '크기', '방향',
            '투명도', '효과', '장면', '배경', '글상자', '리스트',
            '인공지능', '모델학습', '음성인식', '이미지인식'
        ]
        
        # 일반적인 수업 진행 키워드들 (제외할 것들)
        self.exclude_keywords = [
            '시청합니다', '넘어가 주세요', '말하며', '확인합니다', '지도해', 
            '안내해주세요', '칭찬해주세요', '발표', '활동지', '미리 보기',
            '준비물', '인터넷 접속', 'PC', '마무리', '소감', '수업을'
        ]
    
    def is_block_coding_related(self, text: str) -> bool:
        """텍스트가 블록 코딩과 관련된 내용인지 판단"""
        
        # 제외 키워드가 많이 포함된 경우 제외
        exclude_count = sum(1 for keyword in self.exclude_keywords if keyword in text)
        if exclude_count >= 3:
            return False
        
        # 블록 코딩 키워드 확인
        block_count = sum(1 for keyword in self.block_coding_keywords if keyword in text)
        
        # 특정 패턴들 확인
        has_block_pattern = bool(re.search(r'블록을?\s*(활용|사용|이용|조립)', text))
        has_coding_pattern = bool(re.search(r'(코딩|프로그래밍)을?\s*(하|만들|작성)', text))
        has_entry_function = bool(re.search(r'엔트리에서\s*\w+\s*(블록|기능)', text))
        
        # 점수 계산
        score = block_count
        if has_block_pattern: score += 3
        if has_coding_pattern: score += 3  
        if has_entry_function: score += 2
        
        return score >= 2
    
    def extract_block_coding_info(self, text: str) -> str:
        """텍스트에서 블록 코딩 관련 정보만 추출"""
        
        # 문장 단위로 분리
        sentences = re.split(r'[.!?]\s*', text)
        
        coding_sentences = []
        for sentence in sentences:
            if self.is_block_coding_related(sentence) and len(sentence.strip()) > 10:
                # 불필요한 부분 제거
                cleaned = re.sub(r'(주세요|해주세요|합니다)\s*$', '', sentence.strip())
                cleaned = re.sub(r'^(이번|다음|위|아래).*?단계에서는?\s*', '', cleaned)
                
                if cleaned and len(cleaned) > 15:
                    coding_sentences.append(cleaned)
        
        return '. '.join(coding_sentences)
    
    def filter_qa_data(self, input_file: str, output_file: str):
        """JSONL 파일에서 블록 코딩 관련 데이터만 필터링"""
        
        filtered_data = []
        total_count = 0
        
        with open(input_file, 'r', encoding='utf-8') as f:
            for line in f:
                total_count += 1
                try:
                    qa = json.loads(line.strip())
                    
                    question = qa['messages'][0]['content']
                    answer = qa['messages'][1]['content']
                    
                    # 질문과 답변 모두 체크
                    is_question_relevant = self.is_block_coding_related(question)
                    is_answer_relevant = self.is_block_coding_related(answer)
                    
                    if is_question_relevant or is_answer_relevant:
                        # 답변에서 블록 코딩 관련 내용만 추출
                        filtered_answer = self.extract_block_coding_info(answer)
                        
                        if filtered_answer and len(filtered_answer) > 20:
                            # 질문도 블록 코딩 중심으로 수정
                            new_question = self.refine_question(question)
                            
                            filtered_qa = {
                                "messages": [
                                    {"role": "user", "content": new_question},
                                    {"role": "assistant", "content": filtered_answer}
                                ]
                            }
                            filtered_data.append(filtered_qa)
                
                except json.JSONDecodeError:
                    continue
        
        # 결과 저장
        with open(output_file, 'w', encoding='utf-8') as f:
            for qa in filtered_data:
                f.write(json.dumps(qa, ensure_ascii=False) + '\n')
        
        print(f"전체 {total_count}개 중 {len(filtered_data)}개의 블록 코딩 관련 Q&A를 추출했습니다.")
        return filtered_data
    
    def refine_question(self, question: str) -> str:
        """질문을 블록 코딩 중심으로 개선"""
        
        # 수업명 제거하고 블록 코딩 관련 질문으로 변경
        if "단계에서는 무엇을 하나요?" in question:
            if "패턴" in question:
                return "엔트리에서 도장 찍기 블록을 사용해 패턴을 만드는 방법을 설명해주세요."
            elif "오브젝트" in question:
                return "엔트리에서 오브젝트와 관련된 블록 사용법을 설명해주세요."
            elif "신호" in question:
                return "엔트리에서 신호 블록의 사용법을 설명해주세요."
            elif "변수" in question:
                return "엔트리에서 변수 블록의 사용법을 설명해주세요."
            else:
                return question.replace("' 수업에서 '", "에서 ").replace("' 단계에서는 무엇을 하나요?", " 관련 블록 사용법을 설명해주세요.")
        
        return question
    
    def add_block_coding_questions(self, filtered_data: List[Dict]) -> List[Dict]:
        """추가적인 블록 코딩 질문들을 생성"""
        
        additional_qa = [
            {
                "messages": [
                    {"role": "user", "content": "엔트리에서 반복문 블록은 어떻게 사용하나요?"},
                    {"role": "assistant", "content": "'계속 반복하기' 블록을 사용하면 블록이 계속해서 반복 실행됩니다. '10번 반복하기' 블록을 사용하면 지정한 횟수만큼 반복할 수 있습니다."}
                ]
            },
            {
                "messages": [
                    {"role": "user", "content": "엔트리에서 조건문 블록은 어떻게 사용하나요?"},
                    {"role": "assistant", "content": "'만일 (조건) 이라면' 블록을 사용해 특정 조건이 참일 때만 블록이 실행되도록 할 수 있습니다. 조건이 거짓이면 블록이 실행되지 않습니다."}
                ]
            },
            {
                "messages": [
                    {"role": "user", "content": "엔트리에서 오브젝트를 움직이는 블록은 무엇인가요?"},
                    {"role": "assistant", "content": "'x좌표를 10만큼 바꾸기', 'y좌표를 10만큼 바꾸기' 블록을 사용해 오브젝트의 위치를 변경할 수 있습니다. '10도 회전하기' 블록으로 방향을 바꿀 수도 있습니다."}
                ]
            }
        ]
        
        return filtered_data + additional_qa

def main():
    """메인 실행 함수"""
    filter_tool = BlockCodingDataFilter()
    
    input_file = 'entry_finetuning_data.jsonl'  # 원본 파일
    output_file = 'block_coding_only.jsonl'     # 필터링된 파일
    
    try:
        # 블록 코딩 관련 데이터만 필터링
        filtered_data = filter_tool.filter_qa_data(input_file, output_file)
        
        # 추가 질문들 포함
        enhanced_data = filter_tool.add_block_coding_questions(filtered_data)
        
        # 최종 파일 저장
        final_output = 'block_coding_enhanced.jsonl'
        with open(final_output, 'w', encoding='utf-8') as f:
            for qa in enhanced_data:
                f.write(json.dumps(qa, ensure_ascii=False) + '\n')
        
        print(f"\n최종 {len(enhanced_data)}개의 블록 코딩 Q&A가 '{final_output}'에 저장되었습니다.")
        
        # 샘플 출력
        print("\n=== 필터링된 데이터 샘플 ===")
        for i, qa in enumerate(enhanced_data[:3]):
            print(f"\n샘플 {i+1}:")
            print(f"Q: {qa['messages'][0]['content']}")
            print(f"A: {qa['messages'][1]['content']}")
            
    except FileNotFoundError:
        print(f"'{input_file}' 파일을 찾을 수 없습니다.")
    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    main()
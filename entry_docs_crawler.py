import requests
from bs4 import BeautifulSoup
import json
import time
import os
from urllib.parse import urljoin
import re
import random

class EntryDocsCrawler:
    def __init__(self):
        self.base_url = "https://docs.playentry.org"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.crawled_data = []
        
    def get_all_user_doc_urls(self):
        """사용자 문서의 모든 URL을 수집"""
        urls = []
        
        # 블록별 URL 리스트
        block_categories = [
            # 기본 블록들
            "/user/block_start.html",
            "/user/block_flow.html", 
            "/user/block_motion.html",
            "/user/block_looks.html",
            "/user/block_brush.html",
            "/user/block_text.html",
            "/user/block_sound.html",
            "/user/block_decision.html",
            "/user/block_figures.html",
            "/user/block_variable.html",
            "/user/block_function.html",
            "/user/block_table.html",
            
            # AI 관련 블록들
            "/user/what-is-ai.html",
            "/user/block_ai_translate.html",
            "/user/block_ai_tts.html",
            "/user/block_ai_stt.html",
            "/user/block_ai_human.html",
            "/user/block_ai_face.html",
            "/user/block_ai_object.html",
            "/user/block_ai_hand.html",
            
            # 모델 학습 관련
            "/user/what-is-model.html",
            "/user/block_model_image.html",
            "/user/block_model_text.html",
            "/user/block_model_sound.html",
            "/user/block_model_classification.html",
            "/user/block_model_prediction.html",
            "/user/block_model_clustering.html",
            
            # 확장 블록들
            "/user/block_extn_guideline.html",
            "/user/block_extn_weather.html",
            "/user/block_extn_alert.html",
            "/user/block_extn_festival.html",
            "/user/block_hardware.html",
            
            # 화면 구성 요소
            "/user/what-is-project.html",
            "/user/header.html",
            "/user/screen.html",
            "/user/sub-space.html",
            "/user/tab_block.html",
            "/user/tab_shape.html",
            "/user/tab_sound.html",
            "/user/tab_attribute.html",
            "/user/others.html",
            
            # 팝업 관련
            "/user/popup_object.html",
            "/user/popup_table.html",
            "/user/popup_model.html"
        ]
        
        for path in block_categories:
            urls.append(self.base_url + path)
            
        return urls
    
    def extract_content_from_page(self, url):
        """개별 페이지에서 컨텐츠 추출"""
        try:
            print(f"크롤링 중: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 메인 컨텐츠 영역 찾기
            content_area = soup.find('article') or soup.find('main') or soup.find('div', class_='content')
            if not content_area:
                content_area = soup.find('body')
            
            # 제목 추출
            title = soup.find('title')
            title_text = title.get_text().strip() if title else url.split('/')[-1]
            
            # h1, h2, h3 제목들 추출
            headings = []
            for heading in content_area.find_all(['h1', 'h2', 'h3', 'h4']):
                heading_text = heading.get_text().strip()
                if heading_text and len(heading_text) > 1:  # 빈 제목 제외
                    headings.append({
                        'level': heading.name,
                        'text': heading_text
                    })
            
            # 본문 텍스트 추출 (불필요한 요소 제거)
            for element in content_area.find_all(['nav', 'aside', 'footer', 'script', 'style']):
                element.decompose()
            
            # 단락별로 텍스트 추출
            paragraphs = []
            for p in content_area.find_all(['p', 'div', 'li']):
                text = p.get_text().strip()
                if text and len(text) > 20:  # 너무 짧은 텍스트 제외
                    # 텍스트 정리
                    text = re.sub(r'\s+', ' ', text)
                    paragraphs.append(text)
            
            # 전체 텍스트 추출
            full_text = content_area.get_text()
            full_text = re.sub(r'\s+', ' ', full_text).strip()
            
            # 코드 블록이나 예시 찾기
            code_examples = []
            for code in content_area.find_all(['code', 'pre']):
                code_text = code.get_text().strip()
                if code_text:
                    code_examples.append(code_text)
            
            page_data = {
                'url': url,
                'title': title_text,
                'headings': headings,
                'paragraphs': paragraphs,
                'code_examples': code_examples,
                'full_text': full_text,
                'category': self.categorize_page(url)
            }
            
            return page_data
            
        except Exception as e:
            print(f"크롤링 실패 {url}: {str(e)}")
            return None
    
    def categorize_page(self, url):
        """URL을 기반으로 페이지 카테고리 분류"""
        if 'block_start' in url:
            return '시작_블록'
        elif 'block_flow' in url:
            return '흐름_블록'
        elif 'block_motion' in url:
            return '움직임_블록'
        elif 'block_looks' in url:
            return '생김새_블록'
        elif 'block_decision' in url:
            return '판단_블록'
        elif 'block_figures' in url:
            return '계산_블록'
        elif 'block_ai_' in url:
            return 'AI_블록'
        elif 'block_model_' in url:
            return 'AI_모델'
        elif 'what-is-ai' in url or 'what-is-model' in url:
            return 'AI_개념'
        elif 'block_extn_' in url:
            return '확장_블록'
        elif 'popup_' in url:
            return '팝업_기능'
        elif 'tab_' in url:
            return '화면_구성'
        else:
            return '기타'
    
    def generate_diverse_questions(self, category, title, content):
        """다양한 형태의 질문 생성"""
        questions = []
        
        # 카테고리별 질문 패턴
        category_patterns = {
            '시작_블록': [
                "시작 블록은 어떻게 사용하나요?",
                "엔트리에서 프로그램을 시작하려면 어떤 블록을 써야 하나요?",
                "시작하기 블록의 기능이 궁금해요",
                "키보드 이벤트는 어떻게 설정하나요?",
                "마우스 클릭 이벤트를 만들고 싶어요"
            ],
            '움직임_블록': [
                "스프라이트를 움직이려면 어떤 블록을 사용하나요?",
                "좌표 이동은 어떻게 하나요?",
                "회전 블록은 어떻게 사용하나요?",
                "움직임 블록의 종류가 궁금해요"
            ],
            'AI_블록': [
                "AI 블록은 어떻게 사용하나요?",
                "인공지능 기능을 엔트리에서 어떻게 활용하나요?",
                "음성 인식 블록 사용법이 궁금해요",
                "얼굴 인식은 어떻게 하나요?"
            ],
            '판단_블록': [
                "조건문은 어떻게 만드나요?",
                "판단 블록의 사용법이 궁금해요",
                "만약~라면 블록은 어떻게 쓰나요?"
            ]
        }
        
        # 기본 질문들
        if category in category_patterns:
            questions.extend(category_patterns[category])
        
        # 내용 기반 질문 생성
        if '블록' in content:
            questions.append(f"{category.replace('_', ' ')}에서 사용할 수 있는 블록들을 알려주세요")
        
        if '설정' in content:
            questions.append(f"{category.replace('_', ' ')} 설정 방법을 알고 싶어요")
            
        if '입력' in content:
            questions.append(f"입력값은 어떻게 설정하나요?")
        
        return questions[:3]  # 최대 3개까지만 반환
    
    def extract_relevant_answer(self, content, question):
        """질문과 관련된 답변 추출"""
        # 질문 키워드 추출
        question_keywords = []
        if '시작' in question:
            question_keywords = ['시작', '클릭', '실행', '동작']
        elif '움직' in question:
            question_keywords = ['움직', '이동', '좌표', '회전']
        elif 'AI' in question or '인공지능' in question:
            question_keywords = ['AI', '인공지능', '인식', '학습']
        elif '조건' in question or '판단' in question:
            question_keywords = ['조건', '판단', '만약', '라면']
        else:
            question_keywords = ['블록', '사용', '설정']
        
        # 관련 문단 찾기
        relevant_paragraphs = []
        for paragraph in content:
            if any(keyword in paragraph for keyword in question_keywords):
                relevant_paragraphs.append(paragraph)
        
        # 적절한 답변 구성
        if relevant_paragraphs:
            # 가장 적절한 문단 선택 (첫 번째 관련 문단)
            answer = relevant_paragraphs[0]
            
            # 답변이 너무 길면 요약
            if len(answer) > 300:
                answer = answer[:300] + "..."
            
            return answer
        else:
            # 관련 문단이 없으면 전체 내용에서 요약
            if content:
                return content[0][:200] + "..." if len(content[0]) > 200 else content[0]
            else:
                return "해당 내용에 대한 자세한 정보는 엔트리 문서를 참고해주세요."
    
    def convert_to_qa_format(self, page_data):
        """크롤링된 데이터를 Q&A 형태로 변환 (중복 제거)"""
        qa_pairs = []
        
        category = page_data['category']
        title = page_data['title']
        paragraphs = page_data['paragraphs']
        
        if not paragraphs:  # 내용이 없으면 스킵
            return qa_pairs
        
        # 다양한 질문 생성
        questions = self.generate_diverse_questions(category, title, paragraphs)
        
        # 각 질문에 대해 적절한 답변 생성
        for question in questions:
            answer = self.extract_relevant_answer(paragraphs, question)
            
            if answer and len(answer) > 10:  # 의미있는 답변만 추가
                qa_pairs.append({
                    "messages": [
                        {"role": "system", "content": "엔트리 블록 코딩을 도와주는 전문 챗봇입니다. 초보자도 이해하기 쉽게 설명해드립니다."},
                        {"role": "user", "content": question},
                        {"role": "assistant", "content": answer}
                    ],
                    "category": category,
                    "source_url": page_data['url']
                })
        
        # 제목 기반 Q&A (중복되지 않는 것만)
        for heading in page_data['headings']:
            if heading['level'] in ['h2', 'h3'] and len(heading['text']) > 5:
                question = f"{heading['text']}에 대해 자세히 설명해주세요"
                
                # 이미 비슷한 질문이 있는지 확인
                if not any(question.replace('에 대해 자세히 설명해주세요', '') in qa['messages'][1]['content'] 
                          for qa in qa_pairs):
                    
                    answer = self.extract_relevant_answer(paragraphs, heading['text'])
                    
                    if answer and len(answer) > 10:
                        qa_pairs.append({
                            "messages": [
                                {"role": "system", "content": "엔트리 블록 코딩을 도와주는 전문 챗봇입니다."},
                                {"role": "user", "content": question},
                                {"role": "assistant", "content": answer}
                            ],
                            "category": category,
                            "source_url": page_data['url']
                        })
        
        return qa_pairs
    
    def crawl_all_pages(self):
        """모든 페이지 크롤링 실행"""
        urls = self.get_all_user_doc_urls()
        print(f"총 {len(urls)}개 페이지를 크롤링합니다.")
        
        all_qa_data = []
        
        for i, url in enumerate(urls):
            print(f"진행률: {i+1}/{len(urls)}")
            
            page_data = self.extract_content_from_page(url)
            if page_data:
                self.crawled_data.append(page_data)
                
                # Q&A 형태로 변환
                qa_pairs = self.convert_to_qa_format(page_data)
                all_qa_data.extend(qa_pairs)
                
                print(f"  -> {len(qa_pairs)}개의 Q&A 생성")
            
            # 서버 부하 방지를 위한 딜레이
            time.sleep(1)
        
        return all_qa_data
    
    def save_data(self, filename_prefix="entry_docs"):
        """수집된 데이터를 파일로 저장"""
        # 원본 데이터 저장
        with open(f"{filename_prefix}_raw.json", 'w', encoding='utf-8') as f:
            json.dump(self.crawled_data, f, ensure_ascii=False, indent=2)
        
        # Q&A 데이터 저장 (fine-tuning용)
        qa_data = []
        for page_data in self.crawled_data:
            qa_pairs = self.convert_to_qa_format(page_data)
            qa_data.extend(qa_pairs)
        
        with open(f"{filename_prefix}_qa.json", 'w', encoding='utf-8') as f:
            json.dump(qa_data, f, ensure_ascii=False, indent=2)
        
        # JSONL 형태로도 저장 (OpenAI fine-tuning용)
        with open(f"{filename_prefix}_finetuning.jsonl", 'w', encoding='utf-8') as f:
            for qa in qa_data:
                f.write(json.dumps(qa, ensure_ascii=False) + '\n')
        
        print(f"데이터 저장 완료:")
        print(f"- 원본 데이터: {filename_prefix}_raw.json")
        print(f"- Q&A 데이터: {filename_prefix}_qa.json") 
        print(f"- Fine-tuning 데이터: {filename_prefix}_finetuning.jsonl")
        print(f"- 총 Q&A 쌍: {len(qa_data)}개")
        
        # 카테고리별 통계
        category_stats = {}
        for qa in qa_data:
            category = qa.get('category', '기타')
            category_stats[category] = category_stats.get(category, 0) + 1
        
        print("\n카테고리별 Q&A 통계:")
        for category, count in category_stats.items():
            print(f"- {category}: {count}개")

def main():
    crawler = EntryDocsCrawler()
    
    print("엔트리 문서 크롤링을 시작합니다...")
    qa_data = crawler.crawl_all_pages()
    
    print("데이터를 저장합니다...")
    crawler.save_data("entry_blocks_data")
    
    print("크롤링 완료!")

if __name__ == "__main__":
    main()
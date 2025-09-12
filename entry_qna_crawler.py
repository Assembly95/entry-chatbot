import requests
from bs4 import BeautifulSoup
import json
import time
import re
from urllib.parse import urljoin, urlparse
import random
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class EntryQnACrawler:
    def __init__(self, use_selenium=True):
        self.base_url = "https://playentry.org"
        self.qna_url = "https://playentry.org/community/qna"
        self.use_selenium = use_selenium
        
        if use_selenium:
            self.setup_selenium()
        else:
            self.setup_requests()
        
        self.collected_qna = []
        
    def setup_selenium(self):
        """Selenium WebDriver 설정"""
        chrome_options = Options()
        chrome_options.add_argument('--headless')  # 브라우저 창 숨김
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            print("Selenium WebDriver 설정 완료")
        except Exception as e:
            print(f"Selenium 설정 실패: {e}")
            print("requests 모드로 전환합니다.")
            self.use_selenium = False
            self.setup_requests()
    
    def setup_requests(self):
        """requests 세션 설정"""
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ko-KR,ko;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
    
    def get_page_source(self, url, wait_time=3):
        """페이지 소스 가져오기"""
        try:
            if self.use_selenium:
                self.driver.get(url)
                time.sleep(wait_time)
                
                # 동적 콘텐츠 로딩 대기
                try:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.CLASS_NAME, "qna-item"))
                    )
                except:
                    # QnA 아이템이 없으면 일반 콘텐츠 대기
                    time.sleep(2)
                
                return self.driver.page_source
            else:
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                return response.text
                
        except Exception as e:
            print(f"페이지 로딩 실패 {url}: {e}")
            return None
    
    def extract_qna_list_page(self, page_num=1):
        """Q&A 목록 페이지에서 개별 Q&A 링크 추출"""
        list_url = f"{self.qna_url}/list/{page_num}"
        print(f"Q&A 목록 페이지 크롤링: {list_url}")
        
        page_source = self.get_page_source(list_url)
        if not page_source:
            return []
        
        soup = BeautifulSoup(page_source, 'html.parser')
        qna_links = []
        
        # Q&A 게시글 링크 찾기 (실제 HTML 구조에 따라 조정 필요)
        possible_selectors = [
            'a[href*="/community/qna/"]',
            '.qna-item a',
            '.list-item a',
            '.post-title a',
            'a[href*="/qna/"]'
        ]
        
        for selector in possible_selectors:
            links = soup.select(selector)
            if links:
                for link in links:
                    href = link.get('href')
                    if href and '/community/qna/' in href and '/list/' not in href:
                        full_url = urljoin(self.base_url, href)
                        title = link.get_text().strip()
                        if title and len(title) > 3:  # 의미있는 제목만
                            qna_links.append({
                                'url': full_url,
                                'title': title
                            })
                break
        
        # 중복 제거
        seen_urls = set()
        unique_links = []
        for link in qna_links:
            if link['url'] not in seen_urls:
                seen_urls.add(link['url'])
                unique_links.append(link)
        
        print(f"  -> {len(unique_links)}개의 Q&A 링크 발견")
        return unique_links
    
    def extract_qna_content(self, qna_url, title):
        """개별 Q&A 페이지에서 질문과 답변 추출"""
        print(f"Q&A 내용 추출: {qna_url}")
        
        page_source = self.get_page_source(qna_url)
        if not page_source:
            return None
        
        soup = BeautifulSoup(page_source, 'html.parser')
        
        try:
            # 질문 내용 추출
            question_selectors = [
                '.question-content',
                '.post-content',
                '.qna-question',
                '.content-body',
                '.question-text',
                '[class*="question"]',
                '[class*="content"]'
            ]
            
            question_content = None
            for selector in question_selectors:
                element = soup.select_one(selector)
                if element:
                    question_content = element.get_text().strip()
                    if len(question_content) > 10:
                        break
            
            # 질문 내용이 없으면 title 사용
            if not question_content or len(question_content) < 10:
                question_content = title
            
            # 답변 내용 추출
            answer_selectors = [
                '.answer-content',
                '.reply-content',
                '.comment-content',
                '.answer-text',
                '[class*="answer"]',
                '[class*="reply"]',
                '[class*="comment"]'
            ]
            
            answers = []
            for selector in answer_selectors:
                elements = soup.select(selector)
                for element in elements:
                    answer_text = element.get_text().strip()
                    if answer_text and len(answer_text) > 5:
                        # HTML 태그 및 불필요한 공백 정리
                        answer_text = re.sub(r'\s+', ' ', answer_text)
                        answers.append(answer_text)
            
            # 태그 추출 (카테고리 분류용)
            tags = []
            tag_selectors = [
                '.tag',
                '.label',
                '.category',
                '[class*="tag"]'
            ]
            
            for selector in tag_selectors:
                tag_elements = soup.select(selector)
                for tag_elem in tag_elements:
                    tag_text = tag_elem.get_text().strip()
                    if tag_text and len(tag_text) < 20:
                        tags.append(tag_text)
            
            return {
                'url': qna_url,
                'title': title,
                'question': question_content,
                'answers': answers,
                'tags': tags,
                'category': self.categorize_qna(title, question_content, tags)
            }
            
        except Exception as e:
            print(f"Q&A 내용 추출 실패 {qna_url}: {e}")
            return None
    
    def categorize_qna(self, title, question, tags):
        """Q&A를 카테고리별로 분류"""
        text = f"{title} {question}".lower()
        
        if any(keyword in text for keyword in ['블록', 'block']):
            return '블록_사용법'
        elif any(keyword in text for keyword in ['ai', '인공지능', '음성', '얼굴', '인식']):
            return 'AI_기능'
        elif any(keyword in text for keyword in ['게임', '만들기', '프로젝트']):
            return '프로젝트_제작'
        elif any(keyword in text for keyword in ['오류', '에러', '안돼', '작동', '문제']):
            return '문제_해결'
        elif any(keyword in text for keyword in ['스프라이트', '캐릭터', '오브젝트']):
            return '스프라이트_관리'
        elif any(keyword in text for keyword in ['소리', '음악', '사운드']):
            return '소리_기능'
        elif any(keyword in text for keyword in ['변수', '리스트', '데이터']):
            return '데이터_관리'
        elif any(keyword in text for keyword in ['공유', '업로드', '저장']):
            return '작품_관리'
        else:
            return '기타'
    
    def convert_to_training_format(self, qna_data):
        """크롤링된 Q&A를 학습 데이터 형태로 변환"""
        training_data = []
        
        for qna in qna_data:
            if not qna['answers']:  # 답변이 없으면 스킵
                continue
            
            # 가장 좋은 답변 선택 (첫 번째 답변 또는 가장 긴 답변)
            best_answer = qna['answers'][0]
            for answer in qna['answers']:
                if len(answer) > len(best_answer) and len(answer) < 1000:
                    best_answer = answer
            
            # 질문 정리
            question = qna['question']
            if len(question) > 500:
                question = question[:500] + "..."
            
            # 답변 정리
            if len(best_answer) > 800:
                best_answer = best_answer[:800] + "..."
            
            training_data.append({
                "messages": [
                    {"role": "system", "content": "엔트리 블록 코딩을 도와주는 전문 챗봇입니다. 커뮤니티의 실제 질문에 친근하고 도움이 되는 답변을 제공합니다."},
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": best_answer}
                ],
                "category": qna['category'],
                "source": "entry_community_qna",
                "original_url": qna['url'],
                "tags": qna['tags']
            })
        
        return training_data
    
    def crawl_qna_pages(self, max_pages=10, delay=2):
        """여러 페이지의 Q&A 크롤링"""
        print(f"엔트리 Q&A 커뮤니티 크롤링 시작 (최대 {max_pages}페이지)")
        
        all_qna_data = []
        
        for page in range(1, max_pages + 1):
            print(f"\n--- 페이지 {page}/{max_pages} ---")
            
            # Q&A 목록에서 링크 수집
            qna_links = self.extract_qna_list_page(page)
            
            if not qna_links:
                print(f"페이지 {page}에서 Q&A 링크를 찾을 수 없습니다.")
                continue
            
            # 각 Q&A 내용 크롤링
            for i, link in enumerate(qna_links[:10]):  # 페이지당 최대 10개만
                print(f"  진행률: {i+1}/{len(qna_links[:10])}")
                
                qna_content = self.extract_qna_content(link['url'], link['title'])
                if qna_content:
                    all_qna_data.append(qna_content)
                    self.collected_qna.append(qna_content)
                
                # 서버 부하 방지
                time.sleep(delay)
            
            # 페이지 간 딜레이
            time.sleep(delay * 2)
        
        print(f"\n총 {len(all_qna_data)}개의 Q&A 수집 완료")
        return all_qna_data
    
    def save_crawled_data(self, filename_prefix="entry_qna"):
        """수집된 데이터 저장"""
        # 원본 데이터 저장
        with open(f"{filename_prefix}_raw.json", 'w', encoding='utf-8') as f:
            json.dump(self.collected_qna, f, ensure_ascii=False, indent=2)
        
        # 학습 데이터 형태로 변환
        training_data = self.convert_to_training_format(self.collected_qna)
        
        with open(f"{filename_prefix}_training.json", 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        # JSONL 형태로 저장 (OpenAI fine-tuning용)
        with open(f"{filename_prefix}_finetuning.jsonl", 'w', encoding='utf-8') as f:
            for item in training_data:
                f.write(json.dumps(item, ensure_ascii=False) + '\n')
        
        # 통계 출력
        category_stats = {}
        for item in training_data:
            category = item['category']
            category_stats[category] = category_stats.get(category, 0) + 1
        
        print(f"\n=== 데이터 저장 완료 ===")
        print(f"📁 {filename_prefix}_raw.json - 원본 Q&A 데이터")
        print(f"📁 {filename_prefix}_training.json - 학습용 데이터")
        print(f"📁 {filename_prefix}_finetuning.jsonl - OpenAI Fine-tuning용")
        print(f"📊 총 {len(training_data)}개의 학습 데이터 생성")
        
        print("\n카테고리별 통계:")
        for category, count in category_stats.items():
            print(f"- {category}: {count}개")
    
    def close(self):
        """리소스 정리"""
        if self.use_selenium and hasattr(self, 'driver'):
            self.driver.quit()

def main():
    # Selenium 사용 여부 (Chrome 드라이버가 설치되어 있어야 함)
    use_selenium = True  # False로 설정하면 requests만 사용
    
    crawler = EntryQnACrawler(use_selenium=use_selenium)
    
    try:
        # Q&A 크롤링 실행
        qna_data = crawler.crawl_qna_pages(max_pages=5, delay=1)
        
        # 데이터 저장
        crawler.save_crawled_data("entry_community_qna")
        
        print("크롤링 완료!")
        
    except Exception as e:
        print(f"크롤링 중 오류 발생: {e}")
    
    finally:
        crawler.close()

if __name__ == "__main__":
    main()
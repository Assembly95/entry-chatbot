import requests
import re

def extract_blocks_properly():
    """올바른 블록 추출 로직"""
    
    url = "https://raw.githubusercontent.com/entrylabs/entryjs/develop/src/playground/blocks/block_start.js"
    response = requests.get(url)
    content = response.text
    
    print("🔧 수정된 블록 파싱 로직 테스트")
    print("=" * 50)
    
    # 방법 1: getBlocks() 함수 전체를 찾기
    # 중괄호 매칭을 수동으로 처리
    getblocks_start = content.find("getBlocks()")
    if getblocks_start == -1:
        print("❌ getBlocks() 함수를 찾을 수 없음")
        return
    
    # return { 부분 찾기
    return_start = content.find("return {", getblocks_start)
    if return_start == -1:
        print("❌ return { 구문을 찾을 수 없음")
        return
    
    # 중괄호 매칭으로 전체 블록 섹션 추출
    brace_count = 0
    start_pos = content.find("{", return_start)
    current_pos = start_pos
    
    while current_pos < len(content):
        if content[current_pos] == '{':
            brace_count += 1
        elif content[current_pos] == '}':
            brace_count -= 1
            if brace_count == 0:
                break
        current_pos += 1
    
    if brace_count == 0:
        # 전체 블록 섹션 추출 성공
        full_blocks_section = content[start_pos + 1:current_pos]  # 중괄호 제외
        
        print(f"✅ 전체 블록 섹션 추출 성공!")
        print(f"📏 길이: {len(full_blocks_section)} 문자")
        
        # 개별 블록 추출
        blocks_found = extract_individual_blocks(full_blocks_section)
        
        print(f"\n🎯 추출된 블록들 ({len(blocks_found)}개):")
        for i, (block_name, block_info) in enumerate(blocks_found.items(), 1):
            print(f"{i}. {block_name}")
            print(f"   - skeleton: {block_info.get('skeleton', 'N/A')}")
            print(f"   - has_func: {block_info.get('has_func', False)}")
            print(f"   - event: {block_info.get('event', 'N/A')}")
            print()
            
        return blocks_found
    else:
        print("❌ 중괄호 매칭 실패")
        return {}

def extract_individual_blocks(blocks_section):
    """개별 블록 정의 추출 (중괄호 매칭 방식)"""
    blocks = {}
    
    # 블록 이름 패턴으로 시작 위치들 찾기
    block_name_pattern = r'(\w+):\s*\{'
    
    for match in re.finditer(block_name_pattern, blocks_section):
        block_name = match.group(1)
        start_pos = match.end() - 1  # { 위치
        
        # 해당 블록의 끝 찾기 (중괄호 매칭)
        brace_count = 0
        current_pos = start_pos
        
        while current_pos < len(blocks_section):
            if blocks_section[current_pos] == '{':
                brace_count += 1
            elif blocks_section[current_pos] == '}':
                brace_count -= 1
                if brace_count == 0:
                    break
            current_pos += 1
        
        if brace_count == 0:
            # 블록 정의 추출 성공
            block_content = blocks_section[start_pos + 1:current_pos]
            
            # 블록 정보 파싱
            block_info = parse_block_info(block_content)
            blocks[block_name] = block_info
    
    return blocks

def parse_block_info(block_content):
    """블록 내용에서 정보 추출"""
    info = {}
    
    # skeleton 추출
    skeleton_match = re.search(r"skeleton:\s*['\"]([^'\"]+)['\"]", block_content)
    if skeleton_match:
        info['skeleton'] = skeleton_match.group(1)
    
    # color 추출  
    color_match = re.search(r"color:\s*EntryStatic\.colorSet\.block\.default\.(\w+)", block_content)
    if color_match:
        info['color'] = color_match.group(1)
    
    # event 추출
    event_match = re.search(r"event:\s*['\"]([^'\"]+)['\"]", block_content)
    if event_match:
        info['event'] = event_match.group(1)
    
    # func 존재 확인
    if re.search(r"func\s*\([^)]*\)", block_content):
        info['has_func'] = True
    else:
        info['has_func'] = False
    
    # class 추출
    class_match = re.search(r"class:\s*['\"]([^'\"]+)['\"]", block_content)
    if class_match:
        info['class'] = class_match.group(1)
    
    return info

if __name__ == "__main__":
    blocks = extract_blocks_properly()
// blockRenderer.js - Entry 블록 렌더링 전용 모듈

class EntryBlockRenderer {
  constructor() {
    // Entry 카테고리별 색상 정의
    this.blockColors = {
      start: "#00ab00",
      flow: "#179ccb",
      moving: "#a336fa",
      looks: "#ff3356",
      brush: "#ff9000",
      sound: "#5ca800",
      judgement: "#3c57f3",
      calc: "#f2a617",
      variable: "#e19be9",
      func: "#d95208",
    };

    // 레이아웃 상수 (실제 Entry 측정값)
    this.BLOCK_HEIGHT = 28;
    this.BLOCK_PADDING = 5;
    this.CONTAINER_HEADER = 28; // 컨테이너 헤더 높이
    this.CONTAINER_PADDING = 15; // 컨테이너 하단 패딩
    this.INDENT = 14; // 중첩 들여쓰기

    // Canvas 텍스트 측정용
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d");
  }

  // 텍스트 너비 측정
  measureTextWidth(text, fontSize = 12) {
    this.ctx.font = `bold ${fontSize}px "Nanum Gothic", sans-serif`;
    const metrics = this.ctx.measureText(text);
    return Math.ceil(metrics.width) + 28; // 좌우 패딩 포함
  }

  // 블록 너비 계산
  getBlockWidth(text, minWidth = 100, maxWidth = 250) {
    const textWidth = this.measureTextWidth(text);
    return Math.max(minWidth, Math.min(maxWidth, textWidth));
  }

  // 시작 블록 경로 (동적 너비)
  createStartPath(width = 180) {
    return `m 24 34 
            h ${width - 44}
            a 14 14 0 0 0 0 -28
            H 30
            A 17 17 0 0 0 18 1
            C 8.611 1 1 8.611 1 18
            c 0 7.2 4.5 13.5 11 16
            l 6 6
            l 6 -6
            z`;
  }

  // 일반 블록 경로 (동적 너비)
  createSimplePath(width = 165) {
    return `M 0 0
            l 6 6
            l 6 -6
            h ${width - 12}
            a 14 14 0 0 1 0 28
            h -${width - 12}
            l -6 6
            l -6 -6
            z`;
  }

  // 컨테이너 블록 경로 (동적 높이와 너비)
  createContainerPath(width = 140, innerHeight = 0) {
    // 실제 Entry처럼 내부 높이에 따라 동적으로 확장
    const actualInnerHeight = innerHeight > 0 ? innerHeight : 0;

    return `m 0 0
            l 6 6
            l 6 -6
            h ${width - 24}
            a 14 14 0 0 1 0 28
            H 26
            l -6 6
            l -6 -6
            v ${actualInnerHeight}
            l 6 6
            l 6 -6
            h ${width - 36}
            a 7.5 7.5 0 0 1 0 15
            H 12
            l -6 6
            l -6 -6
            z`;
  }

  // 판단 블록 (육각형)
  createJudgementPath(width = 154) {
    return `M 0 14 L 14 0 L ${width - 14} 0 L ${width} 14 L ${width - 14} 28 L 14 28 Z`;
  }

  // 값 블록 (타원형)
  createValuePath(width = 128) {
    return `M 14 0 h ${width - 28} a 14 14 0 0 1 0 28 h -${width - 28} a 14 14 0 0 1 0 -28 z`;
  }

  // 색상 어둡게 하기 (테두리용)
  darkenColor(color) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, (num >> 16) - 30);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - 30);
    const b = Math.max(0, (num & 0x0000ff) - 30);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  // 블록 타입 추론
  inferBlockType(block) {
    if (block.type) return block.type;

    const fileName = block.fileName || "";
    const name = block.name || "";
    const category = block.category || "";

    // 시작 블록
    if (category === "start" || fileName.includes("when_")) {
      return "start";
    }

    // 컨테이너 블록 (반복, 조건)
    if (category === "flow" || category === "repeat") {
      if (
        fileName.includes("repeat") ||
        fileName === "_if" ||
        fileName === "if_else" ||
        name.includes("반복") ||
        name.includes("만약") ||
        name.includes("만일")
      ) {
        return "container";
      }
    }

    // 판단 블록
    if (category === "judgement" || fileName.includes("boolean")) {
      return "judgement";
    }

    // 값 블록
    if (category === "calc" || category === "variable") {
      if (fileName.includes("get_") || fileName.includes("value")) {
        return "value";
      }
    }

    // 기본: 일반 블록
    return "simple";
  }

  // 컨테이너 내부 높이 정확히 계산
  calculateInnerHeight(block) {
    if (!block.children || block.children.length === 0) {
      return 0;
    }

    let totalHeight = 0;

    block.children.forEach((child, index) => {
      // 각 자식 블록의 높이
      totalHeight += this.BLOCK_HEIGHT;

      // 자식이 컨테이너인 경우 그 내부 높이도 추가
      const childType = this.inferBlockType(child);
      if (childType === "container") {
        const childInnerHeight = this.calculateInnerHeight(child);
        if (childInnerHeight > 0) {
          totalHeight += childInnerHeight + this.CONTAINER_PADDING;
        } else {
          totalHeight += this.BLOCK_HEIGHT; // 빈 컨테이너 최소 높이
        }
      }

      // 블록 간 간격
      if (index < block.children.length - 1) {
        totalHeight += this.BLOCK_PADDING;
      }
    });

    // 컨테이너 상하 여백
    return totalHeight + this.BLOCK_HEIGHT;
  }

  // 전체 높이 계산
  calculateTotalHeight(block) {
    let height = 60; // 기본 여백

    if (this.inferBlockType(block) === "start") {
      height += 40; // 시작 블록 높이
      height += this.calculateChildrenHeight(block.children);
    } else {
      height += this.BLOCK_HEIGHT;
      if (this.inferBlockType(block) === "container") {
        height += this.calculateInnerHeight(block);
      }
    }

    return height + 40; // 하단 여백
  }

  // 자식 블록들의 총 높이 계산
  calculateChildrenHeight(children) {
    if (!children || children.length === 0) return 0;

    let height = 0;
    children.forEach((child, index) => {
      if (index > 0) height += this.BLOCK_PADDING;

      height += this.BLOCK_HEIGHT;
      const childType = this.inferBlockType(child);
      if (childType === "container") {
        height += this.calculateInnerHeight(child);
      }
    });

    return height;
  }

  // 텍스트 줄임 처리
  truncateText(text, maxLength = 25) {
    if (!text) return "";
    return text.length > maxLength ? text.substring(0, maxLength - 2) + ".." : text;
  }

  // 블록 렌더링 (재귀)
  renderBlockRecursive(block, x = 0, y = 0, depth = 0) {
    let svg = "";
    const blockType = this.inferBlockType(block);
    const color = this.blockColors[block.category] || "#4C97FF";
    const strokeColor = this.darkenColor(color);
    const text = this.truncateText(block.name || block.fileName || "블록");
    const blockWidth = this.getBlockWidth(text);

    // 선택된 블록 강조
    const isSelected = block.selected || false;
    const strokeWidth = isSelected ? 3 : 1;
    const stroke = isSelected ? "#FFD700" : strokeColor;

    switch (blockType) {
      case "start":
        svg += `
          <g transform="translate(${x},${y})" class="block-group" data-id="${block.id || ""}">
            <g>
              <path d="${this.createStartPath(blockWidth)}" 
                    fill="${color}" 
                    class="blockPath"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"
                    stroke-linejoin="round"
                    stroke-linecap="round"/>
            </g>
            <g transform="translate(18,20)">
              <text font-size="12px" font-weight="bold" font-family="NanumGothic" fill="white" x="21" y="1.315">
                ${text}
              </text>
            </g>
          </g>`;

        // 자식 블록 렌더링
        if (block.children && block.children.length > 0) {
          let childY = y + 34;
          block.children.forEach((child, index) => {
            if (index > 0) childY += this.BLOCK_PADDING;
            svg += this.renderBlockRecursive(child, x + 12, childY, depth + 1);

            childY += this.BLOCK_HEIGHT;
            const childType = this.inferBlockType(child);
            if (childType === "container") {
              childY += this.calculateInnerHeight(child);
            }
          });
        }
        break;

      case "container":
        const innerHeight = this.calculateInnerHeight(block);

        svg += `
          <g transform="translate(${x},${y})" class="block-group" data-id="${block.id || ""}">
            <g>
              <path d="${this.createContainerPath(blockWidth, innerHeight)}" 
                    fill="${color}" 
                    class="blockPath"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"
                    stroke-linejoin="round"
                    stroke-linecap="round"/>
            </g>
            <g transform="translate(14,14)">
              <text font-size="12px" font-weight="bold" font-family="NanumGothic" fill="white" x="0" y="3.315">
                ${text}
              </text>
            </g>
          </g>`;

        // 자식 블록 렌더링 (컨테이너 내부)
        if (block.children && block.children.length > 0) {
          let childY = y + this.CONTAINER_HEADER;
          block.children.forEach((child, index) => {
            if (index > 0) childY += this.BLOCK_PADDING;
            svg += this.renderBlockRecursive(child, x + this.INDENT, childY, depth + 1);

            childY += this.BLOCK_HEIGHT;
            const childType = this.inferBlockType(child);
            if (childType === "container") {
              childY += this.calculateInnerHeight(child);
            }
          });
        }
        break;

      case "judgement":
        svg += `
          <g transform="translate(${x},${y})" class="block-group" data-id="${block.id || ""}">
            <g>
              <path d="${this.createJudgementPath(blockWidth)}" 
                    fill="${color}" 
                    class="blockPath"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"/>
            </g>
            <g transform="translate(20,14)">
              <text font-size="11px" font-weight="bold" font-family="NanumGothic" fill="white" x="0" y="3.315">
                ${text}
              </text>
            </g>
          </g>`;
        break;

      case "value":
        svg += `
          <g transform="translate(${x},${y})" class="block-group" data-id="${block.id || ""}">
            <g>
              <path d="${this.createValuePath(blockWidth)}" 
                    fill="${color}" 
                    class="blockPath"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"/>
            </g>
            <g transform="translate(20,14)">
              <text font-size="11px" font-weight="bold" font-family="NanumGothic" fill="white" x="0" y="3.315">
                ${text}
              </text>
            </g>
          </g>`;
        break;

      default: // simple
        svg += `
          <g transform="translate(${x},${y})" class="block-group" data-id="${block.id || ""}">
            <g>
              <path d="${this.createSimplePath(blockWidth)}" 
                    fill="${color}" 
                    class="blockPath"
                    stroke="${stroke}"
                    stroke-width="${strokeWidth}"
                    stroke-linejoin="round"
                    stroke-linecap="round"/>
            </g>
            <g transform="translate(14,14)">
              <text font-size="12px" font-weight="bold" font-family="NanumGothic" fill="white" x="0" y="3.315">
                ${text}
              </text>
            </g>
          </g>`;

        // 일반 블록의 자식 (있다면)
        if (block.children && block.children.length > 0) {
          let childY = y + this.BLOCK_HEIGHT + this.BLOCK_PADDING;
          block.children.forEach((child, index) => {
            if (index > 0) childY += this.BLOCK_PADDING;
            svg += this.renderBlockRecursive(child, x, childY, depth + 1);
            childY += this.BLOCK_HEIGHT;
          });
        }
    }

    return svg;
  }

  // 메인 렌더링 함수
  renderBlocks(blockData) {
    if (!blockData) return "";

    // 단일 블록 또는 블록 배열 처리
    const blocks = Array.isArray(blockData) ? blockData : [blockData];

    // 시작 블록이 없으면 추가
    let rootBlock;
    if (blocks.length > 0 && blocks[0].category !== "start") {
      rootBlock = {
        id: "start",
        category: "start",
        name: "시작하기 버튼을 클릭했을 때",
        children: blocks,
      };
    } else {
      rootBlock = blocks[0];
    }

    const totalHeight = this.calculateTotalHeight(rootBlock);
    const svgWidth = 380; // 사이드바 너비에 맞춤

    let svg = `
      <svg width="${svgWidth}" height="${totalHeight}" 
           xmlns="http://www.w3.org/2000/svg"
           style="background: transparent;">
        ${this.renderBlockRecursive(rootBlock, 50, 20)}
      </svg>`;

    return svg;
  }

  // 간단한 블록 목록을 시각화 (RAG 결과용)
  renderBlockList(blocks) {
    if (!blocks || blocks.length === 0) return "";

    const blockHeight = 35;
    const padding = 10;
    const totalHeight = (blockHeight + padding) * blocks.length + 20;

    let svg = `
      <svg width="360" height="${totalHeight}" 
           xmlns="http://www.w3.org/2000/svg"
           style="background: transparent;">`;

    blocks.forEach((block, index) => {
      const y = 10 + index * (blockHeight + padding);
      const color = this.blockColors[block.category] || "#4C97FF";
      const text = this.truncateText(block.name || block.fileName, 25);

      svg += `
        <g transform="translate(10, ${y})">
          <rect x="0" y="0" width="340" height="${blockHeight}" 
                rx="8" ry="8"
                fill="${color}" 
                stroke="${this.darkenColor(color)}"
                stroke-width="1"/>
          <text x="15" y="22" font-size="13px" font-weight="bold" fill="white">
            ${text}
          </text>
          <text x="325" y="22" font-size="10px" fill="rgba(255,255,255,0.7)" text-anchor="end">
            ${block.category}
          </text>
        </g>`;
    });

    svg += "</svg>";
    return svg;
  }
}

// 전역으로 사용할 수 있도록
window.EntryBlockRenderer = EntryBlockRenderer;

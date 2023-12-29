class DataController extends EventTarget {
  updateUrlFromInput() {
    const text = document.getElementById("inp").value;
    this.changeUrl(text);
  }
  changeUrl(url) {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.getData(url);
    this.interval = setInterval(() => getData(url), 1000000);
  }
  async getData(url) {
    const response = await fetch(url);
    const data = await this.parseData(response);
    const event = new CustomEvent("datachange", {
      detail: { data: data },
    });
    this.dispatchEvent(event);
  }
  async parseData(resp) {
    return (await resp.json())["data"];
  }
}
class ChartController {
  drawHorisontal(element, index) {
    const position = this.chartCoord[index];
    return `<g>
        <text
          x=${position[0]}
          y=${this.chartHeight + 40}
          class="text"
        >
          ${element.x}
        </text>
        <rect
          class="rect"
          x=${position[0] - this.stepX / 2}
          y=${this.spaceTop}
          width=${this.stepX}
          height=${this.chartHeight}
          onMouseOver="chartController.setHover(${element.value}, 
            ${position[0]}, 
            ${position[1]})"}
        />
      </g>`;
  }
  drawVertical(value, index) {
    return `<text
          x=${0}
          y=${
            this.spaceTop +
            this.chartHeight -
            (index * this.stepY * this.chartHeight) / this.range
          }
        >
          ${value}
        </text>`;
  }
  hideHover() {
    const hover = document.getElementById("hover");
    hover.innerHTML = "";
  }

  setHover(value, posx, posy) {
    const hover = document.getElementById("hover");
    const inner = `
        <circle
          cx=${posx}
          cy=${posy}
          r="5"
          className="circle"
        />
        <rect
          x=${posx}
          y=${this.spaceTop}
          height=${this.chartHeight}
          class="lineHover"
        />
        <rect
          x=${posx + 5}
          y=${posy - 10}
          class="graphLabel" />
        <text
          x=${posx + 30}
          y=${posy}
          class="labelText"
        >
          ${value}
        </text>
        `;
    hover.innerHTML = inner;
  }

  countData(data) {
    [this.boxWidth, this.boxHeight] = [656, 400];
    [this.spaceTop, this.spaceBottom, this.spaceLeft, this.spaceRight] = [
      20, 30, 60, 50,
    ];
    [this.chartWidth, this.chartHeight] = [
      this.boxWidth - this.spaceLeft - this.spaceRight,
      this.boxHeight - this.spaceTop - this.spaceBottom,
    ];

    if (data.length) {
      this.yMax = data
        .filter((el) => !isNaN(el.value))
        .reduce((acc, curr) => (acc.value > curr.value ? acc : curr)).value;
      this.yMin = data
        .filter((el) => !isNaN(el.value))
        .reduce((acc, curr) => (acc.value < curr.value ? acc : curr)).value;
      this.stepX = this.chartWidth / (data.length - 1);
      const numDigits = Math.ceil(Math.log10(this.yMax - this.yMin));
      this.stepY =
        Math.floor((this.yMax - this.yMin) / 10 ** (numDigits - 1)) *
        10 ** (numDigits - 2);
      this.maxVal = Math.ceil(this.yMax / this.stepY) * this.stepY;
      this.minVal = Math.floor(this.yMin / this.stepY) * this.stepY;
      this.range = this.maxVal - this.minVal;

      this.chartCoord = data.map((el, index) => {
        return [
          index * this.stepX + this.spaceLeft,
          this.chartHeight -
            ((el.value - this.minVal) * this.chartHeight) / this.range +
            this.spaceTop,
        ];
      });
      this.lineCoords = this.chartCoord.join(" ");
    }
  }

  drawData(event) {
    const data = event.detail.data;
    this.countData(data);
    const horizontal = data
      .map((value, index) => this.drawHorisontal(value, index))
      .join("");
    let vertical = "";
    let index = 0;
    for (let i = this.minVal; i <= this.maxVal; i += this.stepY) {
      vertical += this.drawVertical(i, index);
      index++;
    }

    const svg = `
            <svg
                viewBox="0 0 ${this.boxWidth} ${this.boxHeight}"
                class="chartSvg"
                onMouseLeave="chartController.hideHover()"
                id="svg"
            >
                <rect
                x=${this.spaceLeft - this.stepX / 2}
                y=0
                width=${this.chartWidth + this.stepX}
                height=${this.chartHeight + this.spaceTop}
                class="colorBackground"
                />
                <g> ${horizontal} </g>
                <g> ${vertical} </g>
                <polyline class="line" points="${this.lineCoords}" />
                <g id="hover"></g>
            </svg>
        `;
    const box = document.getElementById("container");
    box.innerHTML = svg;
  }
}
const dataController = new DataController();
const chartController = new ChartController();
dataController.addEventListener("datachange", (event) =>
  chartController.drawData(event)
);
dataController.changeUrl("http://localhost:3001");

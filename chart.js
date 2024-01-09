/**
 * Represents a DataController.
 * DataController periodically receives data in JSON format at the specified address
 * and processes it for ease of visualization.
 */
class DataController extends EventTarget {
  /**
   * Gets a link from the input and updates it.
   */
  updateUrlFromInput() {
    const text = document.getElementById("inp").value;
    this.changeUrl(text);
  }

  /**
   * Updates periodic data download by url.
   * @param {string} url - New url.
   */
  changeUrl(url) {
    if (this.interval) {
      clearInterval(this.interval);
    }
    this.getData(url);
    this.interval = setInterval(() => getData(url), 1000000);
  }

  /**
   * Loads data from a url and dispatchs event of data changing.
   * @param {string} url - Url.
   */
  async getData(url) {
    const response = await fetch(url);
    const data = await this.parseData(response);
    const event = new CustomEvent("datachange", {
      detail: { data: data },
    });
    this.dispatchEvent(event);
  }

  /**
   * Gets data from response.
   * @param {object} resp - Response with data.
   * @returns {[object]} Array of objects that contain the values and labels of points.
   */
  async parseData(resp) {
    return (await resp.json())["data"];
  }
}

/**
 * Represents a ChartController.
 * ChartController listens to events about the receipt of data from the ChartController and draws a chart.
 */
class ChartController {
  /**
   * Draws horizontal data: x legend and vertical line that triggers graph label on hover.
   * @param {object} element - Point from data.
   * @param {number} index - Index of element.
   * @returns {object} SVG element "g" that contains x legend and vertical line.
   */
  drawHorisontal(element, index) {
    const position = this.chartCoord[index];
    const g = document.createElementNS(this.nsUrl, "g");
    const text = document.createElementNS(this.nsUrl, "text");

    text.setAttribute("x", position[0]);
    text.setAttribute("y", this.chartHeight + 40);
    text.setAttribute("class", "text");
    text.textContent = element.x;

    // Vertical line that triggers graph label on hover.
    const rect = document.createElementNS(this.nsUrl, "rect");
    rect.setAttribute("x", position[0] - this.stepX / 2);
    rect.setAttribute("y", this.spaceTop);
    rect.setAttribute("class", "rect");
    rect.setAttribute("width", this.stepX);
    rect.setAttribute("height", this.chartHeight);
    rect.addEventListener("mouseover", (event) =>
      chartController.setHover(element.value, position[0], position[1])
    );
    g.appendChild(text);
    g.appendChild(rect);

    return g;
  }

  /**
   * Draws vertical data - y legend.
   * @param {string} value - Point value.
   * @param {number} index - Index of element.
   * @returns {object} SVG text element that contains y legend.
   */
  drawVertical(value, index) {
    const text = document.createElementNS(this.nsUrl, "text");
    text.setAttribute(
      "y",
      this.spaceTop +
        this.chartHeight -
        (index * this.stepY * this.chartHeight) / this.range
    );
    text.textContent = value;
    return text;
  }

  /**
   * Hides hover group and hover line.
   */
  hideHover() {
    const hover = document.getElementById("hover");
    hover.setAttribute("visibility", "hidden");
    const hoverLine = document.getElementById("lineHover");
    hoverLine.setAttribute("visibility", "hidden");
  }

  /**
   * Shows hover group and hover line, changes hover label and moves it.
   * @param {string} value - Point value.
   * @param {number} posx - x hover position.
   * @param {number} posy - y hover position.
   */
  setHover(value, posx, posy) {
    const hover = document.getElementById("hover");
    if (hover) {
      hover.setAttribute("transform", `translate(${posx}, ${posy})`);
      hover.setAttribute("visibility", "visible");
      const hoverLine = document.getElementById("lineHover");
      hoverLine.setAttribute("x", posx);
      hoverLine.setAttribute("visibility", "visible");
      const hoverLabel = document.getElementById("hoverLabel");
      hoverLabel.textContent = value;
    }
  }

  /**
   * Counts borders, spaces, max, min, step values at legend, points coords in pixels.
   * @param {[object]} data - Array of points.
   */
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
      // Max value in chart data.
      this.yMax = data
        .filter((el) => !isNaN(el.value))
        .reduce((acc, curr) => (acc.value > curr.value ? acc : curr)).value;
      // Min value in chart data.
      this.yMin = data
        .filter((el) => !isNaN(el.value))
        .reduce((acc, curr) => (acc.value < curr.value ? acc : curr)).value;
      // Space between two points in pixels.
      this.stepX = this.chartWidth / (data.length - 1);
      const numDigits = Math.ceil(Math.log10(this.yMax - this.yMin));
      // Difference between two y labels in numbers.
      this.stepY =
        Math.floor((this.yMax - this.yMin) / 10 ** (numDigits - 1)) *
        10 ** (numDigits - 2);
      // Max value at legend.
      this.maxVal = Math.ceil(this.yMax / this.stepY) * this.stepY;
      // Min value at legend.
      this.minVal = Math.floor(this.yMin / this.stepY) * this.stepY;
      this.range = this.maxVal - this.minVal;

      // Chart points in pixels.
      this.chartCoord = data.map((el, index) => {
        return [
          index * this.stepX + this.spaceLeft,
          this.chartHeight -
            ((el.value - this.minVal) * this.chartHeight) / this.range +
            this.spaceTop,
        ];
      });
    }
  }

  /**
   * Draws or updates chart.
   * @param {object} event - Data update event.
   */
  drawData(event) {
    const data = event.detail.data;
    this.nsUrl = "http://www.w3.org/2000/svg";

    this.countData(data);

    const horizontal = data.map((value, index) =>
      this.drawHorisontal(value, index)
    );

    let vertical = [];
    let index = 0;
    for (let i = this.minVal; i <= this.maxVal; i += this.stepY) {
      vertical.push(this.drawVertical(i, index));
      index++;
    }

    if (this.svgElem) {
      // If chart exists updates it.
      this.gVertical.replaceChildren(...vertical);
      this.gHorizontal.replaceChildren(...horizontal);
      this.polyline.setAttribute("points", this.chartCoord.join(" "));
    } else {
      this.svgElem = document.createElementNS(this.nsUrl, "svg");
      this.svgElem.setAttribute(
        "viewbox",
        `0 0 ${this.boxWidth} ${this.boxHeight}`
      );
      this.svgElem.setAttribute("class", "chartSvg");

      this.svgElem.addEventListener("mouseleave", (event) =>
        chartController.hideHover()
      );
      this.svgElem.setAttribute("id", "svg");

      const rect = document.createElementNS(this.nsUrl, "rect");
      rect.setAttribute("x", `${this.spaceLeft - this.stepX / 2}`);
      rect.setAttribute("y", 0);
      rect.setAttribute("width", `${this.chartWidth + this.stepX}`);
      rect.setAttribute("height", `${this.chartHeight + this.spaceTop}`);
      rect.setAttribute("class", "colorBackground");

      this.gHorizontal = document.createElementNS(this.nsUrl, "g");
      this.gHorizontal.replaceChildren(...horizontal);
      this.gVertical = document.createElementNS(this.nsUrl, "g");
      this.gVertical.replaceChildren(...vertical);

      this.polyline = document.createElementNS(this.nsUrl, "polyline");
      this.polyline.setAttribute("class", "line");
      this.polyline.setAttribute("points", this.chartCoord.join(" "));

      const rectLineHover = document.createElementNS(this.nsUrl, "rect");
      rectLineHover.setAttribute("y", `${this.spaceTop}`);
      rectLineHover.setAttribute("height", `${this.chartHeight}`);
      rectLineHover.setAttribute("class", "lineHover");
      rectLineHover.setAttribute("id", "lineHover");
      rectLineHover.setAttribute("visibility", "hidden");

      const gHover = document.createElementNS(this.nsUrl, "g");
      gHover.setAttribute("id", "hover");
      gHover.setAttribute("visibility", "hidden");

      const circle = document.createElementNS(this.nsUrl, "circle");
      circle.setAttribute("cx", 0);
      circle.setAttribute("cy", 0);
      circle.setAttribute("r", 5);
      circle.setAttribute("class", "circle");

      const rectGraphLabel = document.createElementNS(this.nsUrl, "rect");
      rectGraphLabel.setAttribute("x", 5);
      rectGraphLabel.setAttribute("y", 10);
      rectGraphLabel.setAttribute("class", "graphLabel");

      const textHoverLabel = document.createElementNS(this.nsUrl, "text");
      textHoverLabel.setAttribute("x", 30);
      textHoverLabel.setAttribute("y", 20);
      textHoverLabel.setAttribute("class", "labelText");
      textHoverLabel.setAttribute("id", "hoverLabel");

      this.svgElem.appendChild(rect);
      this.svgElem.appendChild(this.gHorizontal);
      this.svgElem.appendChild(this.gVertical);

      this.svgElem.appendChild(this.polyline);
      this.svgElem.appendChild(rectLineHover);
      this.svgElem.appendChild(gHover);

      gHover.appendChild(circle);
      gHover.appendChild(rectGraphLabel);
      gHover.appendChild(textHoverLabel);

      const box = document.getElementById("container");
      box.replaceChildren(this.svgElem);
    }
  }
}

const dataController = new DataController();
const chartController = new ChartController();
dataController.addEventListener("datachange", (event) =>
  chartController.drawData(event)
);
dataController.changeUrl("http://localhost:3001");

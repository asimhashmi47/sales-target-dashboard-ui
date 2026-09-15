const periods = {
  thisMonth: {
    name: "This Month",
    target: 50000,
    achieved: 36500,
    velocity: 1825,
    deals: 28,
    projected: 56200,
    projectedPct: 112.4,
    daysLeft: 11,
    monthLabel: "March",
    requiredRate: 1227,
    paceVelocity: 13.2,
    delta: "+4.2% vs last month",
    pipeline: 8500,
    gap: 5000,
    chart: "M42 236 L88 222 L134 202 L180 186 L226 160 L272 143 L318 124 L364 112 L430 95",
    dailyChart: "M42 220 L88 211 L134 174 L180 226 L226 154 L272 190 L318 126 L364 182 L430 112",
    today: { x: 430, y: 95 },
    labels: ["Day 1 (Mar 1)", "Day 20 (Today)", "Day 31 (Target End)"],
    milestones: [
      ["25% ($12,500)", "Cleared Day 6 - March 6", "Done", "done"],
      ["50% ($25,000)", "Cleared Day 13 - March 13", "Done", "done"],
      ["75% ($37,500)", "Projected March 21 - $1,000 away", "Next", "next"],
      ["100% ($50,000)", "Projected March 27 - 4 days early", "Pending", "pending"]
    ]
  },
  lastMonth: {
    name: "Last Month",
    target: 48000,
    achieved: 49200,
    velocity: 1757,
    deals: 36,
    projected: 49200,
    projectedPct: 102.5,
    daysLeft: 0,
    monthLabel: "February",
    requiredRate: 0,
    paceVelocity: 2.5,
    delta: "Quota exceeded",
    pipeline: 0,
    gap: 0,
    chart: "M42 236 L98 218 L154 188 L210 160 L266 126 L322 96 L378 72 L434 54 L490 42 L546 32 L600 28",
    dailyChart: "M42 218 L98 170 L154 205 L210 148 L266 172 L322 96 L378 142 L434 84 L490 110 L546 62 L600 94",
    today: { x: 600, y: 28 },
    labels: ["Feb 1", "Feb 15", "Feb 28 (Completed)"],
    milestones: [
      ["25% ($12,000)", "Cleared Feb 7", "Done", "done"],
      ["50% ($24,000)", "Cleared Feb 14", "Done", "done"],
      ["75% ($36,000)", "Cleared Feb 21", "Done", "done"],
      ["100% ($48,000)", "Cleared Feb 27 - 102.5% total", "Done", "done"]
    ]
  },
  thisQuarter: {
    name: "This QTR",
    target: 150000,
    achieved: 98400,
    velocity: 1230,
    deals: 74,
    projected: 154800,
    projectedPct: 103.2,
    daysLeft: 11,
    monthLabel: "Q1",
    requiredRate: 4690,
    paceVelocity: 4.8,
    delta: "+8.1% vs Q4 equivalent",
    pipeline: 42000,
    gap: 9600,
    chart: "M42 236 L130 212 L218 176 L306 144 L394 118 L482 88",
    dailyChart: "M42 224 L130 184 L218 208 L306 136 L394 160 L482 96",
    today: { x: 482, y: 88 },
    labels: ["Jan 1", "Mar 20 (Day 80)", "Mar 31 (Q1 Close)"],
    milestones: [
      ["25% ($37,500)", "Cleared Jan 24", "Done", "done"],
      ["50% ($75,000)", "Cleared Feb 22", "Done", "done"],
      ["75% ($112,500)", "Projected Mar 24 - pipeline will trigger", "Next", "next"],
      ["100% ($150,000)", "Projected Mar 29 - on schedule", "Pending", "pending"]
    ]
  }
};

const gaugeArcLength = 385.3;
let currentPeriod = "thisMonth";
let simulationAdded = 0;
let chartMode = "cumulative";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function currency(value) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function percent(value) {
  return `${Number(value.toFixed(1)).toLocaleString("en-US")}%`;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const animatedValues = new WeakMap();

function animateText(el, targetValue, formatFn, duration = 450) {
  if (!el) return;
  const startValue = animatedValues.get(el) ?? targetValue;
  if (reduceMotion || startValue === targetValue) {
    animatedValues.set(el, targetValue);
    el.textContent = formatFn(targetValue);
    return;
  }
  const startTime = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startValue + (targetValue - startValue) * eased;
    el.textContent = formatFn(current);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      animatedValues.set(el, targetValue);
    }
  }
  requestAnimationFrame(tick);
}

function areaFromPath(path) {
  return `${path} L${path.trim().split(" ").at(-2)?.slice(1) || "600"} 236 L42 236 Z`;
}

function renderMilestones(items) {
  const doneCount = items.filter((item) => item[3] === "done").length;
  $("#milestone-summary").textContent = `${doneCount} of ${items.length} cleared`;
  $("#milestone-list").innerHTML = items
    .map(([title, sub, badge, state]) => {
      const icon = state === "done" ? "✓" : state === "next" ? "•" : "";
      return `
        <div class="milestone is-${state}">
          <span class="milestone__icon" aria-hidden="true">${icon}</span>
          <div>
            <strong>${title}</strong>
            <span>${sub}</span>
          </div>
          <span class="badge">${badge}</span>
        </div>
      `;
    })
    .join("");
}

function render() {
  hideChartTooltip();
  const data = periods[currentPeriod];
  const activeAchieved = data.achieved + simulationAdded;
  const activeRemaining = Math.max(0, data.target - activeAchieved);
  const activePercentRaw = (activeAchieved / data.target) * 100;
  const activePercent = Math.min(activePercentRaw, 100);
  const leftPercent = Math.max(0, 100 - activePercentRaw);
  const pipelinePercent = Math.min(100, (data.pipeline / data.target) * 100);
  const gapPercent = Math.max(0, 100 - activePercent - pipelinePercent);
  const avgDealSize = data.deals ? data.achieved / data.deals : 0;
  const isComplete = activePercentRaw >= 100;

  $("#days-left").textContent = data.daysLeft ? `${data.daysLeft} days left in ${data.monthLabel}` : `${data.monthLabel} closed`;
  $("#status-tag").textContent = isComplete ? "Exceeded" : "On Track";
  $("#status-tag").classList.toggle("is-complete", isComplete);
  $("#status-copy").innerHTML = isComplete
    ? `Final result: <strong>${percent(activePercentRaw)} attainment</strong>. Closed revenue now totals ${currency(activeAchieved)}.`
    : `Pace required: <strong>${currency(data.requiredRate)} / day</strong> across remaining ${data.daysLeft} days to hit 100% quota.`;
  $("#velocity-chip").textContent = `+${data.paceVelocity}% Pace Velocity`;

  $("#gauge-fill").setAttribute("stroke-dasharray", `${(activePercent / 100) * gaugeArcLength} 578`);
  animateText($("#percent-value"), activePercentRaw, percent);
  $("#delta-pill").textContent = data.delta;
  animateText($("#achieved-pill"), activeAchieved, currency);
  $("#target-pill").textContent = currency(data.target);

  $("#velocity-value").textContent = currency(data.velocity);
  $("#deals-value").textContent = data.deals.toLocaleString("en-US");
  $("#deal-size").textContent = `Avg deal size: ${currency(avgDealSize)}`;
  $("#projected-value").textContent = currency(data.projected);
  $("#projected-copy").textContent = `${percent(data.projectedPct)} of Target Baseline`;
  animateText($("#remaining-hero"), activeRemaining, currency);
  $("#remaining-copy").textContent = data.daysLeft ? `${data.daysLeft} days remaining` : "Period closed";

  $("#kpi-target").textContent = currency(data.target);
  $("#kpi-target-copy").textContent = currentPeriod === "thisQuarter" ? "Fixed baseline - Q1 close" : `Fixed baseline - ${data.monthLabel} cycle`;
  animateText($("#kpi-achieved"), activeAchieved, currency);
  animateText($("#kpi-percent"), activePercentRaw, percent);
  $("#kpi-achieved-copy").textContent = `${data.deals} closed wins this period`;
  animateText($("#kpi-remaining"), activeRemaining, currency);
  animateText($("#kpi-left"), leftPercent, percent);
  $("#kpi-remaining-copy").textContent = data.daysLeft ? `${data.daysLeft} days remaining` : "Goal attained";
  $("#kpi-run-rate").innerHTML = `${currency(data.velocity)}<span>/day</span>`;
  $("#kpi-run-rate-copy").textContent = data.requiredRate ? `Req pace: ${currency(data.requiredRate)}/d - +${data.paceVelocity}% ahead` : "Goal attained";

  const activePath = chartMode === "daily" ? data.dailyChart : data.chart;
  $("#actual-line").setAttribute("d", activePath);
  $("#area-line").setAttribute("d", areaFromPath(activePath));
  $("#today-line").setAttribute("x1", data.today.x);
  $("#today-line").setAttribute("x2", data.today.x);
  $("#today-point").setAttribute("cx", data.today.x);
  $("#today-point").setAttribute("cy", chartMode === "daily" ? Math.max(70, data.today.y + 20) : data.today.y);
  $("#axis-start").textContent = data.labels[0];
  $("#axis-today").textContent = data.labels[1];
  $("#axis-end").textContent = data.labels[2];

  $("#composition-target").textContent = `${currency(data.target)} Target`;
  $("#bar-achieved").style.width = `${activePercent}%`;
  $("#bar-pipeline").style.width = `${pipelinePercent}%`;
  $("#bar-gap").style.width = `${gapPercent}%`;
  $("#comp-achieved").textContent = `${currency(activeAchieved)} (${percent(activePercentRaw)})`;
  $("#comp-pipeline").textContent = `${currency(data.pipeline)} (${percent(pipelinePercent)})`;
  $("#comp-gap").textContent = `${currency(Math.max(0, data.target - activeAchieved - data.pipeline))} (${percent(gapPercent)})`;

  renderMilestones(data.milestones);
}

const CHART_X_MIN = 42;
const CHART_X_MAX = 600;
const CHART_Y_TOP = 44;
const CHART_Y_BASE = 236;

function parsePathPoints(d) {
  return d
    .trim()
    .split(/(?=[ML])/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const match = segment.match(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/);
      return [parseFloat(match[1]), parseFloat(match[2])];
    });
}

function valueAtX(points, x) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    if (x >= x1 && x <= x2) {
      const t = x2 === x1 ? 0 : (x - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t;
    }
  }
  return x < points[0][0] ? points[0][1] : points[points.length - 1][1];
}

let hideChartTooltip = () => {};

function setupChartInteractivity() {
  const svg = $(".trend-chart");
  const hitArea = $("#chart-hit-area");
  const hoverLine = $("#hover-line");
  const hoverPoint = $("#hover-point");
  const tooltip = $("#chart-tooltip");
  const chartWrap = document.querySelector(".chart-wrap");
  if (!svg || !hitArea) return;

  function svgPointFromEvent(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: CHART_X_MIN, y: CHART_Y_BASE };
    return pt.matrixTransform(ctm.inverse());
  }

  hitArea.addEventListener("pointermove", (evt) => {
    const point = svgPointFromEvent(evt);
    const x = Math.min(CHART_X_MAX, Math.max(CHART_X_MIN, point.x));
    const points = parsePathPoints($("#actual-line").getAttribute("d"));
    const y = valueAtX(points, x);
    const data = periods[currentPeriod];
    const value = Math.max(0, (data.target * (CHART_Y_BASE - y)) / (CHART_Y_BASE - CHART_Y_TOP));
    const targetValue = (data.target * (x - CHART_X_MIN)) / (CHART_X_MAX - CHART_X_MIN);
    const variance = targetValue > 0 ? ((value - targetValue) / targetValue) * 100 : 0;

    hoverLine.setAttribute("x1", x);
    hoverLine.setAttribute("x2", x);
    hoverLine.setAttribute("opacity", "1");
    hoverPoint.setAttribute("cx", x);
    hoverPoint.setAttribute("cy", y);
    hoverPoint.setAttribute("opacity", "1");

    const svgRect = svg.getBoundingClientRect();
    const wrapRect = chartWrap.getBoundingClientRect();
    const scaleX = svgRect.width / 620;
    const scaleY = svgRect.height / 280;
    tooltip.style.left = `${x * scaleX + (svgRect.left - wrapRect.left)}px`;
    tooltip.style.top = `${y * scaleY + (svgRect.top - wrapRect.top) - 12}px`;
    tooltip.classList.add("is-visible");
    $("#tooltip-value").textContent = currency(value);
    $("#tooltip-vs-target").textContent = `${variance >= 0 ? "+" : ""}${variance.toFixed(1)}% vs target pace`;
  });

  hideChartTooltip = () => {
    hoverLine.setAttribute("opacity", "0");
    hoverPoint.setAttribute("opacity", "0");
    tooltip.classList.remove("is-visible");
  };

  hitArea.addEventListener("pointerleave", hideChartTooltip);
}

const THEME_KEY = "sales-dashboard-theme";

function applyTheme(theme) {
  document.documentElement.classList.toggle("theme-light", theme === "light");
  document.documentElement.classList.toggle("theme-dark", theme !== "light");
}

$$("[data-period]").forEach((button) => {
  button.addEventListener("click", () => {
    currentPeriod = button.dataset.period;
    simulationAdded = 0;
    $$("[data-period]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
      item.setAttribute("aria-selected", item === button ? "true" : "false");
    });
    render();
  });
});

$$("[data-chart]").forEach((button) => {
  button.addEventListener("click", () => {
    chartMode = button.dataset.chart;
    $$("[data-chart]").forEach((item) => item.classList.toggle("is-active", item === button));
    render();
  });
});

$$("[data-sim]").forEach((button) => {
  button.addEventListener("click", () => {
    simulationAdded += Number(button.dataset.sim);
    render();
  });
});

$("#sim-reset").addEventListener("click", () => {
  simulationAdded = 0;
  render();
});

$("#theme-toggle").addEventListener("click", () => {
  const nextTheme = document.documentElement.classList.contains("theme-light") ? "dark" : "light";
  applyTheme(nextTheme);
  localStorage.setItem(THEME_KEY, nextTheme);
});

$("#recalculate").addEventListener("click", (event) => {
  event.currentTarget.classList.add("is-spinning");
  window.setTimeout(() => event.currentTarget.classList.remove("is-spinning"), 700);
  render();
});

setupChartInteractivity();
render();

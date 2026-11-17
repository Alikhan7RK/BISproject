import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Chart, Plugin, registerables } from 'chart.js';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { LanguageService } from '../../core/language.service';
import { DayCalories, DaySummary, Meal } from '../../core/models';

Chart.register(...registerables); // enable all Chart.js chart types (bar, line, ...)

// Chart colors (same as --primary / --danger in styles.scss)
const COLOR_OK = '#1f8a4c';
const COLOR_OVER = '#c0392b';
const COLOR_GOAL = '#66706a';

const GOAL_DATASET = 2; // index of the "Daily goal" dataset in the chart

/**
 * Small Chart.js plugin: draws the daily goal as a dashed horizontal line across the WHOLE chart
 * area (left edge to right edge). A normal line dataset would start and end in the middle of
 * the first and last bars.
 */
function goalLinePlugin(goal: number, datasetIndex: number): Plugin<'bar'> {
  return {
    id: 'goalLine',
    afterDatasetsDraw(chart) {
      if (!chart.isDatasetVisible(datasetIndex)) return; // hidden via the legend
      const { ctx, chartArea } = chart;
      const y = chart.scales['y'].getPixelForValue(goal);
      ctx.save();
      ctx.strokeStyle = COLOR_GOAL;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.restore();
    },
  };
}

// Translation keys for day names; index = Date.getDay() (0 = Sunday)
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((d) => `dashboard.weekdays.${d}`);

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe, DecimalPipe, DatePipe],
  template: `
    <div class="row" style="justify-content: space-between">
      <h1>{{ 'dashboard.hello' | translate: { name: auth.user()?.username } }}</h1>
      <a class="btn" routerLink="/add-meal">+ {{ 'nav.addMeal' | translate }}</a>
    </div>

    @if (summary(); as s) {
      <div class="card">
        <h2>{{ 'dashboard.today' | translate }}</h2>
        <p>
          <strong>{{ s.totals.calories | number: '1.0-0' }}</strong> / {{ s.goal.daily_calories }} kcal
        </p>
        <div class="progress" [class.over]="s.totals.calories > s.goal.daily_calories">
          <div [style.width.%]="percent(s.totals.calories, s.goal.daily_calories)"></div>
        </div>
        <div class="grid" style="margin-top: 16px">
          <div>{{ 'nutrients.protein' | translate }}: {{ s.totals.protein }} / {{ s.goal.daily_protein }} g</div>
          <div>{{ 'nutrients.fat' | translate }}: {{ s.totals.fat }} / {{ s.goal.daily_fat }} g</div>
          <div>{{ 'nutrients.carbs' | translate }}: {{ s.totals.carbs }} / {{ s.goal.daily_carbs }} g</div>
        </div>
      </div>
    }

    <!-- Weekly chart: bars = calories per day, dashed line = daily goal -->
    <div class="card">
      <h2>{{ 'dashboard.week' | translate }}</h2>
      <div style="position: relative; height: 280px">
        <canvas #weekChart></canvas>
      </div>
    </div>

    <div class="card">
      <h2>{{ 'dashboard.todayMeals' | translate }}</h2>
      @for (m of meals(); track m.id) {
        <div class="row" style="justify-content: space-between; padding: 6px 0">
          <span>{{ 'mealType.' + m.meal_type | translate }} · {{ lang.localName(m.dish_detail) }}</span>
          <span class="muted">{{ m.calories | number: '1.0-0' }} kcal · {{ m.eaten_at | date: 'HH:mm' }}</span>
        </div>
      } @empty {
        <p class="muted">{{ 'dashboard.noMeals' | translate }}</p>
      }
    </div>
  `,
})
export class DashboardPage implements OnInit, OnDestroy {
  protected auth = inject(AuthService);
  protected lang = inject(LanguageService);
  private api = inject(ApiService);
  private translate = inject(TranslateService);

  summary = signal<DaySummary | null>(null);
  meals = signal<Meal[]>([]);

  private canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('weekChart');
  private week: DayCalories[] = [];
  private chart: Chart | null = null;

  constructor() {
    // Redraw the chart with new labels when the user switches EN / RU / KZ
    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe(() => this.drawChart());
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.api.summary(today).subscribe((s) => this.summary.set(s));
    this.api.meals(today).subscribe((page) => this.meals.set(page.results));
    this.api.weekly(7).subscribe((days) => {
      this.week = days;
      this.drawChart();
    });
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  /** (Re)creates the weekly chart. Called when data arrives and when the language changes. */
  private drawChart(): void {
    if (!this.week.length) return;
    const keys = ['dashboard.withinGoal', 'dashboard.aboveGoal', 'dashboard.dailyGoal', ...WEEKDAY_KEYS];
    // get() waits until the language file is loaded, so we never show raw keys
    this.translate.get(keys).subscribe((t) => {
      const labels = this.week.map((d) => {
        const [y, m, day] = d.date.split('-').map(Number);
        const weekday = new Date(y, m - 1, day).getDay(); // local date, no time-zone shift
        return `${t[WEEKDAY_KEYS[weekday]]} ${day}`;
      });
      // Two bar datasets so the legend explains both colors: each day has a value in only one of them
      const within = this.week.map((d) => (d.calories <= d.goal ? d.calories : null));
      const above = this.week.map((d) => (d.calories > d.goal ? d.calories : null));
      const goal = this.week[this.week.length - 1].goal; // the user's current goal (same for every day)

      this.chart?.destroy(); // Chart.js cannot change everything in place, so we draw a new one
      this.chart = new Chart(this.canvas().nativeElement, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: t['dashboard.withinGoal'], data: within, backgroundColor: COLOR_OK, grouped: false },
            { label: t['dashboard.aboveGoal'], data: above, backgroundColor: COLOR_OVER, grouped: false },
            {
              // Empty line dataset: it only gives "Daily goal" its legend entry (and lets the user
              // hide it by clicking the legend). The line itself is drawn by goalLinePlugin.
              type: 'line', label: t['dashboard.dailyGoal'], data: this.week.map(() => null),
              borderColor: COLOR_GOAL, backgroundColor: 'transparent', borderDash: [6, 4], pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false, // fill the 280px-high box
          scales: {
            // suggestedMax: keep the goal line visible even if every day is below the goal
            y: { beginAtZero: true, suggestedMax: goal * 1.1, title: { display: true, text: 'kcal' } },
          },
        },
        plugins: [goalLinePlugin(goal, GOAL_DATASET)],
      });
    });
  }

  percent(value: number, goal: number): number {
    return goal ? Math.min(100, (value / goal) * 100) : 0;
  }
}

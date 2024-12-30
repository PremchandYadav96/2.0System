import * as d3 from 'd3';
import { HealthMetric } from '../../types';
import { GradientGenerator } from '../utils/GradientGenerator';
import { AnimationController } from '../utils/AnimationController';

export class AdvancedRadarChart {
  private readonly gradientGen: GradientGenerator;
  private readonly animator: AnimationController;
  private readonly glowFilter: string;

  constructor(container: string, config: RadarConfig) {
    this.gradientGen = new GradientGenerator(this.svg.append('defs'));
    this.animator = new AnimationController();
    this.glowFilter = this.createGlowFilter();

    // Initialize enhanced features
    this.initializeEnhancedFeatures();
  }

  private createGlowFilter(): string {
    const filterId = `glow-${Math.random().toString(36).substr(2, 9)}`;
    const filter = this.svg.append('defs')
      .append('filter')
      .attr('id', filterId)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '2')
      .attr('result', 'coloredBlur');

    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    return `url(#${filterId})`;
  }

  private initializeEnhancedFeatures(): void {
    this.initializeGridAnimation();
    this.setupPulseAnimation();
    this.createDynamicGradients();
    this.setupMetricHighlighting();
  }

  private async drawEnhancedData(metrics: HealthMetric[]): Promise<void> {
    const layers = this.calculateDataLayers(metrics);
    
    // Draw multiple layers with different opacities
    layers.forEach((layer, index) => {
      const opacity = 0.1 + (index * 0.15);
      const gradient = this.gradientGen.createRadialGradient(
        `data-layer-${index}`,
        ['#72ACF0', '#2E5EAA'],
        opacity
      );

      this.drawDataLayer(layer, gradient);
    });

    // Add anomaly indicators
    this.drawAnomalyIndicators(metrics);
    
    // Add trend arrows
    this.drawTrendIndicators(metrics);
    
    // Add correlation lines
    this.drawCorrelationLines(metrics);
  }

  private drawAnomalyIndicators(metrics: HealthMetric[]): void {
    metrics.forEach(metric => {
      if (metric.anomaly?.isAnomaly) {
        const point = this.getMetricPosition(metric);
        
        this.svg.append('circle')
          .attr('cx', point.x)
          .attr('cy', point.y)
          .attr('r', 12)
          .style('fill', 'none')
          .style('stroke', '#FF4444')
          .style('stroke-width', 2)
          .style('filter', this.glowFilter)
          .call(this.animator.pulseAnimation);
      }
    });
  }

  private drawTrendIndicators(metrics: HealthMetric[]): void {
    metrics.forEach(metric => {
      if (metric.trend) {
        const point = this.getMetricPosition(metric);
        const angle = metric.trend.direction === 'increasing' ? -45 : 45;
        
        this.svg.append('path')
          .attr('d', this.createArrowPath(point, angle))
          .style('fill', metric.trend.direction === 'increasing' ? '#44FF44' : '#FF4444')
          .style('filter', this.glowFilter)
          .call(this.animator.fadeInOutAnimation);
      }
    });
  }

  private drawCorrelationLines(metrics: HealthMetric[]): void {
    // Draw correlation lines between highly correlated metrics
    metrics.forEach((metric1, i) => {
      metrics.slice(i + 1).forEach(metric2 => {
        const correlation = this.calculateCorrelation(metric1, metric2);
        if (Math.abs(correlation) > 0.7) {
          const point1 = this.getMetricPosition(metric1);
          const point2 = this.getMetricPosition(metric2);
          
          this.svg.append('line')
            .attr('x1', point1.x)
            .attr('y1', point1.y)
            .attr('x2', point2.x)
            .attr('y2', point2.y)
            .style('stroke', correlation > 0 ? '#44FF44' : '#FF4444')
            .style('stroke-width', Math.abs(correlation) * 2)
            .style('stroke-opacity', 0.3)
            .style('filter', this.glowFilter);
        }
      });
    });
  }

  private addEnhancedInteractivity(): void {
    // Add 3D rotation on drag
    const drag = d3.drag()
      .on('drag', (event) => {
        const rotation = this.calculateRotation(event.dx, event.dy);
        this.svg.style('transform', `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`);
      });

    this.svg.call(drag as any);

    // Add metric highlighting
    this.svg.selectAll('.radar-point')
      .on('mouseover', (event, d: any) => {
        this.highlightMetricAndRelated(d.name);
      })
      .on('mouseout', () => {
        this.resetHighlighting();
      });
  }

  private highlightMetricAndRelated(metricName: string): void {
    // Dim all elements
    this.svg.selectAll('*').style('opacity', 0.3);

    // Highlight selected metric and related elements
    this.svg.selectAll(`[data-metric="${metricName}"]`)
      .style('opacity', 1)
      .style('filter', this.glowFilter);

    // Highlight correlated metrics
    this.findCorrelatedMetrics(metricName).forEach(correlatedMetric => {
      this.svg.selectAll(`[data-metric="${correlatedMetric}"]`)
        .style('opacity', 0.7)
        .style('filter', this.glowFilter);
    });
  }
}
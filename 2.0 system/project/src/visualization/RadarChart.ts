import * as d3 from 'd3';
import { HealthMetric } from '../types';

export class RadarChart {
  private svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  private config: RadarConfig;
  private scales: Map<string, d3.ScaleLinear<number, number>>;
  private axes: d3.Selection<SVGGElement, string, SVGGElement, unknown>[];

  constructor(container: string, config: RadarConfig) {
    this.config = {
      width: 600,
      height: 600,
      margin: 50,
      levels: 5,
      maxValue: 100,
      labelFactor: 1.15,
      ...config
    };

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      .append('g')
      .attr('transform', `translate(${this.config.width/2},${this.config.height/2})`);

    this.scales = new Map();
    this.axes = [];
  }

  async render(metrics: HealthMetric[]): Promise<void> {
    this.setupScales(metrics);
    this.drawLevels();
    this.drawAxes(metrics);
    await this.drawData(metrics);
    this.addInteractivity();
  }

  private setupScales(metrics: HealthMetric[]): void {
    metrics.forEach(metric => {
      this.scales.set(
        metric.name,
        d3.scaleLinear()
          .domain([0, metric.maxValue])
          .range([0, this.config.width / 2 - this.config.margin])
      );
    });
  }

  private drawLevels(): void {
    const levels = d3.range(1, this.config.levels + 1);
    
    levels.forEach(level => {
      const radius = (this.config.width / 2 - this.config.margin) * (level / this.config.levels);
      
      this.svg.append('circle')
        .attr('r', radius)
        .attr('class', 'radar-level')
        .style('fill', 'none')
        .style('stroke', '#CDCDCD')
        .style('stroke-opacity', '0.1');

      // Add value indicators
      if (level < this.config.levels) {
        this.svg.append('text')
          .attr('x', 5)
          .attr('y', -radius)
          .attr('class', 'radar-level-value')
          .text((level * 20).toString());
      }
    });
  }

  private drawAxes(metrics: HealthMetric[]): void {
    const angleSlice = (Math.PI * 2) / metrics.length;

    this.axes = metrics.map((metric, i) => {
      const angle = angleSlice * i;
      const line = this.svg.append('g').attr('class', 'radar-axis');

      // Draw axis line
      line.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', (this.config.width/2 - this.config.margin) * Math.cos(angle - Math.PI/2))
        .attr('y2', (this.config.width/2 - this.config.margin) * Math.sin(angle - Math.PI/2))
        .style('stroke', '#999')
        .style('stroke-width', '2px');

      // Add axis label
      line.append('text')
        .attr('class', 'radar-axis-label')
        .attr('x', (this.config.width/2 - this.config.margin + 20) * Math.cos(angle - Math.PI/2))
        .attr('y', (this.config.width/2 - this.config.margin + 20) * Math.sin(angle - Math.PI/2))
        .text(metric.name);

      return line;
    });
  }

  private async drawData(metrics: HealthMetric[]): Promise<void> {
    const angleSlice = (Math.PI * 2) / metrics.length;
    const points = metrics.map((metric, i) => {
      const angle = angleSlice * i;
      const scale = this.scales.get(metric.name)!;
      return {
        x: scale(metric.value) * Math.cos(angle - Math.PI/2),
        y: scale(metric.value) * Math.sin(angle - Math.PI/2),
        value: metric.value,
        name: metric.name
      };
    });

    // Draw radar area
    const radarLine = d3.lineRadial<{x: number; y: number}>()
      .radius(d => Math.sqrt(d.x * d.x + d.y * d.y))
      .angle((_, i) => i * angleSlice);

    this.svg.append('path')
      .datum(points)
      .attr('class', 'radar-area')
      .attr('d', radarLine as any)
      .style('fill', 'rgba(114,172,240,0.2)')
      .style('stroke', '#72ACF0')
      .style('stroke-width', '2px');

    // Add data points
    this.svg.selectAll('.radar-point')
      .data(points)
      .enter()
      .append('circle')
      .attr('class', 'radar-point')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 5)
      .style('fill', '#72ACF0');
  }

  private addInteractivity(): void {
    // Add hover effects
    this.svg.selectAll('.radar-point')
      .on('mouseover', (event, d: any) => {
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'radar-tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0,0,0,0.7)')
          .style('color', 'white')
          .style('padding', '10px')
          .style('border-radius', '5px');

        tooltip.html(`
          <strong>${d.name}</strong><br/>
          Value: ${d.value}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');

        // Highlight point
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 8)
          .style('fill', '#FFA500');
      })
      .on('mouseout', (event) => {
        d3.selectAll('.radar-tooltip').remove();
        
        d3.select(event.currentTarget)
          .transition()
          .duration(200)
          .attr('r', 5)
          .style('fill', '#72ACF0');
      });

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 2])
      .on('zoom', (event) => {
        this.svg.attr('transform', event.transform);
      });

    d3.select(this.svg.node()?.parentNode as Element)
      .call(zoom as any);
  }
}
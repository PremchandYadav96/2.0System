export class GradientGenerator {
  private readonly defs: d3.Selection<any, unknown, null, undefined>;

  constructor(defs: d3.Selection<any, unknown, null, undefined>) {
    this.defs = defs;
  }

  createRadialGradient(
    id: string,
    colors: string[],
    opacity: number = 1
  ): string {
    const gradient = this.defs.append('radialGradient')
      .attr('id', id)
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');

    colors.forEach((color, index) => {
      gradient.append('stop')
        .attr('offset', `${(index / (colors.length - 1)) * 100}%`)
        .attr('stop-color', color)
        .attr('stop-opacity', opacity);
    });

    return `url(#${id})`;
  }

  createLinearGradient(
    id: string,
    colors: string[],
    angle: number = 0
  ): string {
    const x1 = 0;
    const y1 = 0;
    const x2 = Math.cos(angle * Math.PI / 180);
    const y2 = Math.sin(angle * Math.PI / 180);

    const gradient = this.defs.append('linearGradient')
      .attr('id', id)
      .attr('x1', `${x1 * 100}%`)
      .attr('y1', `${y1 * 100}%`)
      .attr('x2', `${x2 * 100}%`)
      .attr('y2', `${y2 * 100}%`);

    colors.forEach((color, index) => {
      gradient.append('stop')
        .attr('offset', `${(index / (colors.length - 1)) * 100}%`)
        .attr('stop-color', color);
    });

    return `url(#${id})`;
  }
}
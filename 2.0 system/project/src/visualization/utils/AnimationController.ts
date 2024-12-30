export class AnimationController {
  pulseAnimation(element: d3.Selection<any, unknown, null, undefined>): void {
    element.transition()
      .duration(1000)
      .attr('r', (d: any) => d.r * 1.2)
      .style('opacity', 0.8)
      .transition()
      .duration(1000)
      .attr('r', (d: any) => d.r)
      .style('opacity', 1)
      .on('end', function() {
        d3.select(this).call(pulseAnimation);
      });
  }

  fadeInOutAnimation(
    element: d3.Selection<any, unknown, null, undefined>
  ): void {
    element.style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1)
      .transition()
      .duration(1000)
      .style('opacity', 0.3)
      .on('end', function() {
        d3.select(this).call(fadeInOutAnimation);
      });
  }

  rotateAnimation(
    element: d3.Selection<any, unknown, null, undefined>
  ): void {
    let angle = 0;
    
    function rotate() {
      angle = (angle + 1) % 360;
      element.style('transform', `rotate(${angle}deg)`);
      requestAnimationFrame(rotate);
    }

    rotate();
  }

  waveAnimation(
    element: d3.Selection<any, unknown, null, undefined>,
    amplitude: number = 10,
    frequency: number = 0.1
  ): void {
    let time = 0;
    
    function wave() {
      time += frequency;
      const y = amplitude * Math.sin(time);
      element.style('transform', `translateY(${y}px)`);
      requestAnimationFrame(wave);
    }

    wave();
  }
}
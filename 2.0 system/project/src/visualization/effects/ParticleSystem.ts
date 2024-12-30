export class ParticleSystem {
  private particles: Particle[] = [];
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.initializeParticles();
    this.animate();
  }

  private initializeParticles(): void {
    for (let i = 0; i < 100; i++) {
      this.particles.push(new Particle(
        Math.random() * this.ctx.canvas.width,
        Math.random() * this.ctx.canvas.height
      ));
    }
  }

  private animate(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.particles.forEach(particle => {
      particle.update();
      particle.draw(this.ctx);
    });

    this.drawConnections();
    requestAnimationFrame(() => this.animate());
  }

  private drawConnections(): void {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = `rgba(255,255,255,${1 - distance/100})`;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
        }
      }
    }
  }
}
import { WebGLRenderer } from './renderers/WebGLRenderer';
import { ShaderProgram } from './shaders/ShaderProgram';
import { HealthMetric } from '../../types';

export class HealthMetricsGL {
  private readonly renderer: WebGLRenderer;
  private readonly shaderProgram: ShaderProgram;
  private readonly canvas: HTMLCanvasElement;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    container.appendChild(this.canvas);

    this.renderer = new WebGLRenderer(this.canvas);
    this.shaderProgram = new ShaderProgram(this.renderer.gl);
    
    this.initializeGL();
  }

  private initializeGL(): void {
    // Initialize WebGL context with advanced features
    const gl = this.renderer.gl;
    
    // Enable extensions for advanced rendering
    gl.getExtension('OES_texture_float');
    gl.getExtension('WEBGL_draw_buffers');
    gl.getExtension('OES_standard_derivatives');
    
    // Set up advanced rendering pipeline
    this.setupRenderingPipeline();
  }

  private setupRenderingPipeline(): void {
    // Create framebuffers for deferred rendering
    this.createFramebuffers();
    
    // Set up post-processing effects
    this.setupPostProcessing();
    
    // Initialize particle system
    this.initializeParticleSystem();
  }

  async render(metrics: HealthMetric[]): Promise<void> {
    // Clear buffers
    this.renderer.clear();
    
    // Update uniforms
    this.updateShaderUniforms(metrics);
    
    // Render geometry
    this.renderGeometry();
    
    // Apply post-processing
    this.applyPostProcessing();
    
    // Present final frame
    this.renderer.present();
  }

  private updateShaderUniforms(metrics: HealthMetric[]): void {
    const gl = this.renderer.gl;
    
    // Update time uniform
    const timeLocation = gl.getUniformLocation(
      this.shaderProgram.program,
      'u_time'
    );
    gl.uniform1f(timeLocation, performance.now() / 1000.0);
    
    // Update metrics data texture
    this.updateMetricsTexture(metrics);
  }

  private renderGeometry(): void {
    const gl = this.renderer.gl;
    
    // Bind geometry buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
    // Draw geometry
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }
}
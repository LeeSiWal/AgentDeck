import { useEffect, useRef } from 'react';
import { SubAgent } from '../../stores/appStore';

interface SubAgentParticlesProps {
  subAgents: SubAgent[];
  width?: number;
  height?: number;
}

const TYPE_COLORS: Record<string, string> = {
  read: '#3B82F6', write: '#F59E0B', bash: '#10B981', search: '#8B5CF6',
  think: '#EC4899', worker: '#6B7280',
};

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number; maxLife: number;
}

export function SubAgentParticles({ subAgents, width = 300, height = 200 }: SubAgentParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const activeTypesRef = useRef<string[]>([]);

  // Update active types ref without restarting the RAF loop
  useEffect(() => {
    activeTypesRef.current = subAgents.filter(s => s.status === 'running').map(s => s.type);
  }, [subAgents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      const activeTypes = activeTypesRef.current;

      // Spawn particles for active agents
      if (activeTypes.length > 0 && Math.random() < 0.3) {
        const type = activeTypes[Math.floor(Math.random() * activeTypes.length)];
        particlesRef.current.push({
          x: width / 2 + (Math.random() - 0.5) * 60,
          y: height / 2 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.5 - 0.5,
          color: TYPE_COLORS[type] || TYPE_COLORS.worker,
          size: Math.random() * 3 + 1,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }

      // Update and draw
      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        const alpha = 1 - p.life / p.maxLife;
        if (alpha <= 0) return false;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fill();
        return true;
      });

      animRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} className="pointer-events-none" />;
}
